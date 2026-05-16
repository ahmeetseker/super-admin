/**
 * Wave F21.0 — GDPR/KVKK data-rights workflow store.
 *
 * Front-end side only:
 *   - `previewCascade(tenantId)` synthesises a delete-impact preview
 *     from the public mocks (TENANTS + LISTINGS/CUSTOMERS/AUDIT_LOG)
 *   - `buildExportBundle(tenantId)` produces a JSON snapshot string —
 *     a real backend swaps this for a multi-table SQL dump or S3 archive.
 *   - Request history lives in `arsam.platform-data-rights.v1` so the
 *     audit trail survives reloads.
 */

import { TENANTS, LISTINGS, CUSTOMERS, AUDIT_LOG, type Tenant } from '@landx/data'
import { getResourceUsage } from '@/lib/super-admin-tenant-analytics'

export type DataRightsKind = 'export' | 'delete'
export type DataRightsStatus = 'pending' | 'preview' | 'completed' | 'cancelled'

export interface DataRightsRequest {
  id: string
  kind: DataRightsKind
  tenantId: string
  tenantName: string
  requestedBy: string
  requestedISO: string
  status: DataRightsStatus
  completedISO?: string
  notes?: string
}

export interface CascadePreview {
  tenant: { id: string; name: string }
  customers: number
  listings: number
  transactions: number
  auditEntries: number
  storageMb: number
  dbRows: number
}

export const DATA_RIGHTS_STORAGE_KEY = 'arsam.platform-data-rights.v1'

function newId(): string {
  return `dr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function findTenant(id: string): Tenant | null {
  return TENANTS.find((t) => t.id === id) ?? null
}

/**
 * Public-mock projeksiyonu. Gerçek backend bunun yerine canlı row count'a
 * gider — UI bekleyen davranış aynı.
 */
export function previewCascade(tenantId: string): CascadePreview {
  const tenant = findTenant(tenantId)
  const name = tenant?.name ?? tenantId
  const usage = tenant ? getResourceUsage(tenant) : { dbRows: 0, storageMb: 0 } as const

  // Mocks aren't tenant-scoped today, so we approximate using listingCount/userCount
  // weights from the seed. Real backend ignores these — it asks for the row count.
  const customers = tenant ? Math.max(0, tenant.userCount * 12 + Math.floor(tenant.listingCount / 2)) : 0
  const listings = tenant?.listingCount ?? 0
  const transactions = tenant ? Math.max(0, Math.floor(tenant.listingCount * 1.3) + tenant.userCount) : 0
  const auditEntries = AUDIT_LOG.filter((a) => a.tenantId === tenantId).length

  // If audit log is empty for the tenant (frequent for trial seeds), at least
  // attribute the tenant's own creation event so the preview never reads as zero.
  const auditApprox = auditEntries > 0 ? auditEntries : tenant ? Math.max(3, Math.floor(listings / 3)) : 0

  return {
    tenant: { id: tenantId, name },
    customers,
    listings,
    transactions,
    auditEntries: auditApprox,
    storageMb: usage.storageMb,
    dbRows: usage.dbRows,
  }
}

export function buildExportBundle(tenantId: string): { filename: string; bytes: string } {
  const tenant = findTenant(tenantId)
  const tenantListings = LISTINGS.filter((l) => l.city === tenant?.city).slice(0, 20)
  const tenantCustomers = CUSTOMERS.slice(0, 25)
  const tenantAudit = AUDIT_LOG.filter((a) => a.tenantId === tenantId).slice(0, 50)

  const bundle = {
    tenant: tenant ?? { id: tenantId, missing: true },
    exportedAt: new Date().toISOString(),
    counts: previewCascade(tenantId),
    samples: {
      listings: tenantListings,
      customers: tenantCustomers,
      audit: tenantAudit,
    },
  }
  const slug = (tenant?.name ?? tenantId).toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]+/g, '-')
  const stamp = new Date().toISOString().slice(0, 10)
  return {
    filename: `${slug}-veri-export-${stamp}.json`,
    bytes: JSON.stringify(bundle, null, 2),
  }
}

function readStore(): DataRightsRequest[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(DATA_RIGHTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DataRightsRequest[]) : []
  } catch {
    return []
  }
}

function writeStore(rows: DataRightsRequest[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(DATA_RIGHTS_STORAGE_KEY, JSON.stringify(rows))
  } catch {
    /* ignore quota */
  }
}

export function listRequests(): DataRightsRequest[] {
  return readStore().sort((a, b) => b.requestedISO.localeCompare(a.requestedISO))
}

export interface CreateRequestInput {
  kind: DataRightsKind
  tenantId: string
  requestedBy: string
  notes?: string
}

export function createRequest(input: CreateRequestInput): DataRightsRequest {
  const tenant = findTenant(input.tenantId)
  const request: DataRightsRequest = {
    id: newId(),
    kind: input.kind,
    tenantId: input.tenantId,
    tenantName: tenant?.name ?? input.tenantId,
    requestedBy: input.requestedBy,
    requestedISO: new Date().toISOString(),
    status: 'pending',
    notes: input.notes?.trim() || undefined,
  }
  const all = readStore()
  all.push(request)
  writeStore(all)
  return request
}

export function completeRequest(id: string): DataRightsRequest | null {
  const all = readStore()
  const idx = all.findIndex((r) => r.id === id)
  if (idx < 0) return null
  all[idx] = { ...all[idx], status: 'completed', completedISO: new Date().toISOString() }
  writeStore(all)
  return all[idx]
}

export function cancelRequest(id: string): DataRightsRequest | null {
  const all = readStore()
  const idx = all.findIndex((r) => r.id === id)
  if (idx < 0) return null
  all[idx] = { ...all[idx], status: 'cancelled' }
  writeStore(all)
  return all[idx]
}

export function resetDataRightsForTests(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(DATA_RIGHTS_STORAGE_KEY)
}
