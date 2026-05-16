// Tests for lib/platform-plans.ts.
// Covers seed, CRUD, reorder, tenant-count guard, malformed/empty/dedupe edges.
// F13.E: in-memory localStorage shim moved to apps/super-admin/vitest.setup.ts.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  canDeletePlan,
  reorderPlans,
  getTenantCountForPlan,
  __resetPlatformPlansForTests,
  __STORAGE_KEY,
} from '@/lib/platform-plans'

describe('platform-plans', () => {
  beforeEach(() => {
    __resetPlatformPlansForTests()
  })

  it('seeds 4 default plans on first read (Ücretsiz/Pro/Premium/Kurumsal)', () => {
    const plans = getPlans()
    expect(plans).toHaveLength(4)
    const names = plans.map((p) => p.name)
    expect(names).toEqual(['Ücretsiz', 'Pro', 'Premium', 'Kurumsal'])
    expect(plans.map((p) => p.tier)).toEqual(['free', 'pro', 'premium', 'custom'])
    expect(plans.map((p) => p.sortOrder)).toEqual([0, 1, 2, 3])
    // sanity: limits.listings -1 marker present on Premium + Kurumsal
    expect(plans[2].limits.listings).toBe(-1)
    expect(plans[3].limits.listings).toBe(-1)
  })

  it('createPlan appends with next sortOrder and unique id', () => {
    const before = getPlans()
    const created = createPlan({
      name: 'Beta',
      tier: 'pro',
      priceMonthly: 199,
      features: ['Özellik 1'],
      limits: { listings: 10, users: 2, storageGb: 5 },
      isActive: true,
    })
    expect(created.id).toBeTruthy()
    expect(created.sortOrder).toBe(before.length)
    const after = getPlans()
    expect(after).toHaveLength(before.length + 1)
    expect(after.find((p) => p.id === created.id)?.name).toBe('Beta')
  })

  it('updatePlan patches existing plan, returns updated record', () => {
    const initial = getPlans()
    const target = initial[1] // Pro
    const updated = updatePlan(target.id, { priceMonthly: 349, isActive: false })
    expect(updated).not.toBeNull()
    expect(updated!.priceMonthly).toBe(349)
    expect(updated!.isActive).toBe(false)
    expect(updated!.id).toBe(target.id)
    // Other fields preserved.
    expect(updated!.name).toBe(target.name)
  })

  it('deletePlan removes plan when no tenants attached', () => {
    const before = getPlans()
    // Use last seed (Kurumsal — likely zero tenants in mock).
    const target = before[3]
    const ok = deletePlan(target.id)
    expect(ok).toBe(true)
    const after = getPlans()
    expect(after).toHaveLength(before.length - 1)
    expect(after.find((p) => p.id === target.id)).toBeUndefined()
  })

  it('canDeletePlan / deletePlan blocks deletion when tenantCount > 0', () => {
    // Pro tier has tenants in the TENANTS mock (multiple 'Pro' rows).
    const plans = getPlans()
    const pro = plans.find((p) => p.tier === 'pro')!
    const count = getTenantCountForPlan(pro.id)
    expect(count).toBeGreaterThan(0)
    expect(canDeletePlan(pro.id)).toBe(false)
    const ok = deletePlan(pro.id)
    expect(ok).toBe(false)
    expect(getPlans().find((p) => p.id === pro.id)).toBeDefined()
  })

  it('reorderPlans rewrites sortOrder by the given id order', () => {
    const before = getPlans()
    const reversed = [...before].reverse().map((p) => p.id)
    const result = reorderPlans(reversed)
    expect(result.map((p) => p.id)).toEqual(reversed)
    // Persisted: subsequent read keeps the new order.
    const persisted = getPlans()
    expect(persisted.map((p) => p.id)).toEqual(reversed)
    // sortOrder rewritten to match index.
    expect(persisted.map((p) => p.sortOrder)).toEqual([0, 1, 2, 3])
  })

  it('getTenantCountForPlan is deterministic + non-negative for all seed plans', () => {
    for (const p of getPlans()) {
      const n = getTenantCountForPlan(p.id)
      expect(n).toBeGreaterThanOrEqual(0)
      // Repeated calls return the same number.
      expect(getTenantCountForPlan(p.id)).toBe(n)
    }
  })

  it('malformed storage payload falls back to default seed', () => {
    window.localStorage.setItem(__STORAGE_KEY, '{not json')
    __resetPlatformPlansForTests()
    const plans = getPlans()
    expect(plans).toHaveLength(4)
    expect(plans[0].name).toBe('Ücretsiz')
  })

  it('empty storage array re-seeds defaults (treated as missing)', () => {
    window.localStorage.setItem(__STORAGE_KEY, JSON.stringify([]))
    __resetPlatformPlansForTests()
    const plans = getPlans()
    expect(plans).toHaveLength(4)
  })

  it('createPlan dedupes ids across rapid successive calls', () => {
    const a = createPlan({
      name: 'A',
      tier: 'pro',
      priceMonthly: 1,
      features: [],
      limits: { listings: 1, users: 1, storageGb: 1 },
      isActive: true,
    })
    const b = createPlan({
      name: 'B',
      tier: 'pro',
      priceMonthly: 1,
      features: [],
      limits: { listings: 1, users: 1, storageGb: 1 },
      isActive: true,
    })
    expect(a.id).not.toBe(b.id)
    const all = getPlans()
    const ids = new Set(all.map((p) => p.id))
    expect(ids.size).toBe(all.length)
  })
})
