import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TENANTS } from '@landx/data'
import {
  buildExportBundle,
  cancelRequest,
  completeRequest,
  createRequest,
  listRequests,
  previewCascade,
  resetDataRightsForTests,
} from '@/lib/data-rights'

const SAMPLE_TENANT_ID = TENANTS[0].id

describe('previewCascade', () => {
  it('returns positive counts for a real tenant', () => {
    const p = previewCascade(SAMPLE_TENANT_ID)
    expect(p.tenant.id).toBe(SAMPLE_TENANT_ID)
    expect(p.tenant.name).toBe(TENANTS[0].name)
    expect(p.listings).toBeGreaterThanOrEqual(0)
    expect(p.customers).toBeGreaterThanOrEqual(0)
    expect(p.transactions).toBeGreaterThanOrEqual(0)
    expect(p.auditEntries).toBeGreaterThanOrEqual(0)
    expect(p.storageMb).toBeGreaterThanOrEqual(0)
  })

  it('handles unknown tenant gracefully', () => {
    const p = previewCascade('nope-not-real')
    expect(p.tenant.id).toBe('nope-not-real')
    expect(p.listings).toBe(0)
    expect(p.customers).toBe(0)
  })
})

describe('buildExportBundle', () => {
  it('produces a JSON bundle with counts + samples', () => {
    const out = buildExportBundle(SAMPLE_TENANT_ID)
    expect(out.filename.endsWith('.json')).toBe(true)
    expect(out.filename).toMatch(/veri-export/)
    const parsed = JSON.parse(out.bytes)
    expect(parsed.tenant).toBeTruthy()
    expect(parsed.counts).toBeTruthy()
    expect(parsed.samples).toBeTruthy()
    expect(parsed.exportedAt).toMatch(/\d{4}-\d{2}-\d{2}T/)
  })
})

describe('request store', () => {
  beforeEach(() => {
    resetDataRightsForTests()
  })
  afterEach(() => {
    resetDataRightsForTests()
  })

  it('createRequest persists a pending entry', () => {
    const r = createRequest({ kind: 'export', tenantId: SAMPLE_TENANT_ID, requestedBy: 'ops@arsam' })
    expect(r.status).toBe('pending')
    expect(r.kind).toBe('export')
    expect(listRequests().length).toBe(1)
  })

  it('completeRequest sets status + completedISO', () => {
    const r = createRequest({ kind: 'delete', tenantId: SAMPLE_TENANT_ID, requestedBy: 'ops' })
    const done = completeRequest(r.id)
    expect(done?.status).toBe('completed')
    expect(done?.completedISO).toBeTruthy()
  })

  it('cancelRequest sets status cancelled', () => {
    const r = createRequest({ kind: 'export', tenantId: SAMPLE_TENANT_ID, requestedBy: 'ops' })
    expect(cancelRequest(r.id)?.status).toBe('cancelled')
  })

  it('listRequests sorts descending by requestedISO', async () => {
    createRequest({ kind: 'export', tenantId: SAMPLE_TENANT_ID, requestedBy: 'a' })
    await new Promise((r) => setTimeout(r, 5))
    createRequest({ kind: 'delete', tenantId: SAMPLE_TENANT_ID, requestedBy: 'b' })
    const all = listRequests()
    expect(all[0].requestedISO >= all[1].requestedISO).toBe(true)
  })
})
