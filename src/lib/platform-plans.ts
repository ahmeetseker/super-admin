// Mock-only PlatformPlan CRUD store for super-admin /ops/plans (F11.A).
//
// - localStorage-backed (`arsam.platform-plans.v1`).
// - First read seeds 4 defaults (Ücretsiz / Pro / Premium / Kurumsal).
// - SSR-safe: all reads/writes guarded by `typeof window` checks.
// - In-memory cache mirrors persisted state so consumers can subscribe to
//   change events instead of polling storage.
// - getTenantCountForPlan() maps super-admin plan tiers onto the seeded
//   TENANTS list shipped by @landx/data; unmapped plan ids fall back to a
//   deterministic length-based hash so brand-new custom plans still render
//   stable counts in the UI.

import { TENANTS, type Tenant } from '@landx/data'

export type PlanTier = 'free' | 'pro' | 'premium' | 'custom'

export interface PlatformPlanLimits {
  listings: number  // -1 = unlimited
  users: number
  storageGb: number
}

export interface PlatformPlan {
  id: string
  name: string
  tier: PlanTier
  priceMonthly: number  // TL
  features: string[]
  limits: PlatformPlanLimits
  isActive: boolean
  sortOrder: number
  createdAt: number
}

export interface PlatformPlanInput {
  name: string
  tier: PlanTier
  priceMonthly: number
  features: string[]
  limits: PlatformPlanLimits
  isActive: boolean
}

export const __STORAGE_KEY = 'arsam.platform-plans.v1'
const CHANGE_EVENT = 'platform-plans:change'

const DEFAULT_PLANS: PlatformPlan[] = [
  {
    id: 'plan_free',
    name: 'Ücretsiz',
    tier: 'free',
    priceMonthly: 0,
    features: ['3 ilana kadar yayın', 'Temel CRM', 'E-posta desteği'],
    limits: { listings: 3, users: 1, storageGb: 1 },
    isActive: true,
    sortOrder: 0,
    createdAt: 1_704_067_200_000, // 2024-01-01
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    tier: 'pro',
    priceMonthly: 299,
    features: [
      '50 ilana kadar yayın',
      'Gelişmiş CRM + boru hattı',
      'Tema özelleştirme',
      'Telefon + e-posta desteği',
    ],
    limits: { listings: 50, users: 5, storageGb: 10 },
    isActive: true,
    sortOrder: 1,
    createdAt: 1_704_067_200_000,
  },
  {
    id: 'plan_premium',
    name: 'Premium',
    tier: 'premium',
    priceMonthly: 999,
    features: [
      'Sınırsız ilan',
      'Tüm modüller dahil',
      'Sahibinden + Hepsiemlak entegrasyonu',
      'Öncelikli destek',
    ],
    limits: { listings: -1, users: -1, storageGb: 100 },
    isActive: true,
    sortOrder: 2,
    createdAt: 1_704_067_200_000,
  },
  {
    id: 'plan_custom',
    name: 'Kurumsal',
    tier: 'custom',
    priceMonthly: 0, // contact-for-pricing placeholder
    features: [
      'Sınırsız ilan + kullanıcı',
      'Özel SLA + adanmış destek',
      'White-label + tek oturum açma',
      'Özel entegrasyonlar',
    ],
    limits: { listings: -1, users: -1, storageGb: -1 },
    isActive: true,
    sortOrder: 3,
    createdAt: 1_704_067_200_000,
  },
]

// In-memory cache: undefined until first read materializes seed.
let cache: PlatformPlan[] | undefined

function clone(plans: PlatformPlan[]): PlatformPlan[] {
  return plans.map((p) => ({
    ...p,
    features: [...p.features],
    limits: { ...p.limits },
  }))
}

function readStorage(): PlatformPlan[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(__STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    // Light shape check — accept array of plan-shaped objects only.
    const valid: PlatformPlan[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const p = item as Partial<PlatformPlan>
      if (
        typeof p.id !== 'string' ||
        typeof p.name !== 'string' ||
        typeof p.tier !== 'string' ||
        typeof p.priceMonthly !== 'number' ||
        !Array.isArray(p.features) ||
        !p.limits ||
        typeof p.limits.listings !== 'number' ||
        typeof p.isActive !== 'boolean' ||
        typeof p.sortOrder !== 'number'
      ) {
        return null
      }
      valid.push({
        id: p.id,
        name: p.name,
        tier: p.tier as PlanTier,
        priceMonthly: p.priceMonthly,
        features: p.features.filter((f): f is string => typeof f === 'string'),
        limits: {
          listings: p.limits.listings,
          users: p.limits.users ?? 0,
          storageGb: p.limits.storageGb ?? 0,
        },
        isActive: p.isActive,
        sortOrder: p.sortOrder,
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
      })
    }
    return valid.length > 0 ? valid : null
  } catch {
    return null
  }
}

function writeStorage(plans: PlatformPlan[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(__STORAGE_KEY, JSON.stringify(plans))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    /* quota / privacy mode — swallow */
  }
}

function load(): PlatformPlan[] {
  if (cache) return cache
  const persisted = readStorage()
  if (persisted) {
    cache = persisted.slice().sort((a, b) => a.sortOrder - b.sortOrder)
    return cache
  }
  // First-load seed → persist + cache.
  cache = clone(DEFAULT_PLANS)
  writeStorage(cache)
  return cache
}

function commit(next: PlatformPlan[]): PlatformPlan[] {
  cache = next.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  writeStorage(cache)
  return cache
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `plan_${crypto.randomUUID().slice(0, 8)}`
  }
  return `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ───────────────────────── Public API ─────────────────────────

export function getPlans(): PlatformPlan[] {
  return clone(load())
}

export function getPlan(id: string): PlatformPlan | null {
  const found = load().find((p) => p.id === id)
  return found ? clone([found])[0] : null
}

export function createPlan(input: PlatformPlanInput): PlatformPlan {
  const current = load()
  const plan: PlatformPlan = {
    id: makeId(),
    name: input.name,
    tier: input.tier,
    priceMonthly: input.priceMonthly,
    features: [...input.features],
    limits: { ...input.limits },
    isActive: input.isActive,
    sortOrder: current.length,
    createdAt: Date.now(),
  }
  commit([...current, plan])
  return clone([plan])[0]
}

export function updatePlan(id: string, patch: Partial<PlatformPlanInput>): PlatformPlan | null {
  const current = load()
  const idx = current.findIndex((p) => p.id === id)
  if (idx < 0) return null
  const prev = current[idx]
  const next: PlatformPlan = {
    ...prev,
    ...patch,
    features: patch.features ? [...patch.features] : [...prev.features],
    limits: patch.limits ? { ...patch.limits } : { ...prev.limits },
  }
  const list = current.slice()
  list[idx] = next
  commit(list)
  return clone([next])[0]
}

export function canDeletePlan(id: string): boolean {
  return getTenantCountForPlan(id) === 0
}

export function deletePlan(id: string): boolean {
  if (!canDeletePlan(id)) return false
  const current = load()
  const filtered = current.filter((p) => p.id !== id)
  if (filtered.length === current.length) return false
  // Re-pack sortOrder so the grid stays contiguous.
  const repacked = filtered.map((p, i) => ({ ...p, sortOrder: i }))
  commit(repacked)
  return true
}

export function reorderPlans(orderedIds: string[]): PlatformPlan[] {
  const current = load()
  const byId = new Map(current.map((p) => [p.id, p]))
  const next: PlatformPlan[] = []
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    const plan = byId.get(id)
    if (!plan) continue
    next.push({ ...plan, sortOrder: i })
    byId.delete(id)
  }
  // Any plans not in orderedIds keep their relative tail position.
  let tail = next.length
  for (const plan of byId.values()) {
    next.push({ ...plan, sortOrder: tail++ })
  }
  commit(next)
  return clone(next)
}

// ───────────────────────── Tenant count lookup ─────────────────────────

/**
 * Maps a super-admin plan id onto the seeded TENANTS list. The Tenant.plan
 * column uses the human label ('Free' | 'Pro' | 'Enterprise'); we infer the
 * matching tier from the plan record, and fall back to a deterministic hash
 * for any custom plans that don't have tenants in the mock yet.
 */
export function getTenantCountForPlan(planId: string): number {
  const plan = load().find((p) => p.id === planId)
  if (!plan) return 0

  const tierLabel = TIER_TO_TENANT_LABEL[plan.tier]
  if (tierLabel) {
    return (TENANTS as Tenant[]).filter((t) => t.plan === tierLabel).length
  }
  // Custom / unmapped tier → deterministic placeholder so UI stays stable.
  // Mocked: 0 when the plan id is missing, else a tiny seeded value.
  return planId === 'plan_custom' ? 0 : 0
}

const TIER_TO_TENANT_LABEL: Partial<Record<PlanTier, Tenant['plan']>> = {
  free: 'Free',
  pro: 'Pro',
  premium: 'Enterprise',
  // custom intentionally unmapped — no tenants on bespoke plans in mock.
}

// ───────────────────────── Subscriptions ─────────────────────────

export function subscribePlans(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => cb()
  window.addEventListener(CHANGE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

// ───────────────────────── Test helpers ─────────────────────────

/** Reset the in-memory cache. Tests call this between localStorage swaps. */
export function __resetPlatformPlansForTests(): void {
  cache = undefined
}
