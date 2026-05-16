/**
 * Wave F21.0 — Per-tenant IP allowlist storage with CIDR parsing.
 *
 * IPv4 only (V1) — IPv6 CIDR comes once the real backend supports it.
 * `parseCidr` returns null on invalid input so callers can render an
 * inline error without try/catch noise.
 */

const ALLOWLIST_STORAGE_KEY = 'arsam.platform-ip-allowlist.v1'

export interface IpAllowEntry {
  id: string
  tenantId: string
  cidr: string
  label?: string
  createdISO: string
  createdBy: string
}

export interface ParsedCidr {
  ip: string
  mask: number
  ipInt: number
  maskInt: number
}

function newId(): string {
  return `ip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function ipToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const v = Number(p)
    if (v < 0 || v > 255) return null
    n = (n << 8) + v
  }
  return n >>> 0
}

export function parseCidr(input: string): ParsedCidr | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const slashIdx = trimmed.indexOf('/')
  let ip: string
  let mask: number
  if (slashIdx === -1) {
    ip = trimmed
    mask = 32
  } else {
    ip = trimmed.slice(0, slashIdx)
    const maskStr = trimmed.slice(slashIdx + 1)
    if (!/^\d{1,2}$/.test(maskStr)) return null
    mask = Number(maskStr)
    if (mask < 0 || mask > 32) return null
  }
  const ipInt = ipToInt(ip)
  if (ipInt === null) return null
  const maskInt = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0
  return { ip, mask, ipInt, maskInt }
}

export function isValidCidr(input: string): boolean {
  return parseCidr(input) !== null
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const target = ipToInt(ip)
  if (target === null) return false
  const parsed = parseCidr(cidr)
  if (parsed === null) return false
  return (target & parsed.maskInt) === (parsed.ipInt & parsed.maskInt)
}

export function cidrSize(cidr: string): number {
  const p = parseCidr(cidr)
  if (!p) return 0
  return Math.pow(2, 32 - p.mask)
}

function readStore(): IpAllowEntry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(ALLOWLIST_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isValidEntry) : []
  } catch {
    return []
  }
}

function isValidEntry(v: unknown): v is IpAllowEntry {
  if (!v || typeof v !== 'object') return false
  const e = v as Partial<IpAllowEntry>
  return (
    typeof e.id === 'string' &&
    typeof e.tenantId === 'string' &&
    typeof e.cidr === 'string' &&
    typeof e.createdISO === 'string' &&
    typeof e.createdBy === 'string'
  )
}

function writeStore(entries: IpAllowEntry[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(ALLOWLIST_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* ignore quota */
  }
}

export function listAllowEntries(tenantId?: string): IpAllowEntry[] {
  const all = readStore()
  return tenantId ? all.filter((e) => e.tenantId === tenantId) : all
}

export interface AddAllowEntryInput {
  tenantId: string
  cidr: string
  label?: string
  createdBy: string
}

export function addAllowEntry(input: AddAllowEntryInput): IpAllowEntry {
  if (!isValidCidr(input.cidr)) {
    throw new Error('Geçersiz CIDR formatı')
  }
  const entry: IpAllowEntry = {
    id: newId(),
    tenantId: input.tenantId,
    cidr: input.cidr.trim(),
    label: input.label?.trim() || undefined,
    createdISO: new Date().toISOString(),
    createdBy: input.createdBy,
  }
  const all = readStore()
  all.push(entry)
  writeStore(all)
  return entry
}

export function removeAllowEntry(id: string): void {
  const next = readStore().filter((e) => e.id !== id)
  writeStore(next)
}

export const TWOFA_POLICY_STORAGE_KEY = 'arsam.platform-2fa-policy.v1'

export type TwoFaPolicy = Record<string, boolean>

export function getTwoFaPolicy(): TwoFaPolicy {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(TWOFA_POLICY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as TwoFaPolicy) : {}
  } catch {
    return {}
  }
}

export function setTwoFaPolicy(roleId: string, required: boolean): TwoFaPolicy {
  const current = getTwoFaPolicy()
  current[roleId] = required
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(TWOFA_POLICY_STORAGE_KEY, JSON.stringify(current))
    } catch {
      /* ignore */
    }
  }
  return current
}

export function resetAllowlistForTests(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(ALLOWLIST_STORAGE_KEY)
  localStorage.removeItem(TWOFA_POLICY_STORAGE_KEY)
}
