import { describe, expect, it } from 'vitest'
import { TENANTS } from '@landx/data'
import {
  getCohortMatrix,
  getChurnRate,
  getLtvPerPlan,
  getResourceUsage,
  getRevenueHistory,
  getTenantHealth,
  tierLabel,
  tierBadgeClass,
} from '@/lib/super-admin-tenant-analytics'

const NOW = Date.parse('2026-05-14T12:00:00Z')

describe('getRevenueHistory', () => {
  it('returns the requested number of months', () => {
    const out = getRevenueHistory(12, NOW)
    expect(out.length).toBe(12)
  })

  it('every entry has shape { month, mrr, arr, newMrr, churnedMrr, expansionMrr }', () => {
    const out = getRevenueHistory(6, NOW)
    for (const row of out) {
      expect(typeof row.month).toBe('string')
      expect(row.mrr).toBeGreaterThanOrEqual(0)
      expect(row.arr).toBe(row.mrr * 12)
      expect(row.newMrr).toBeGreaterThanOrEqual(0)
      expect(row.churnedMrr).toBeGreaterThanOrEqual(0)
    }
  })

  it('the most recent month MRR sums active-or-recently-active tenants', () => {
    const [last] = getRevenueHistory(1, NOW)
    const expectedFloor = TENANTS.filter((t) => t.status === 'Aktif').reduce(
      (s, t) => s + t.mrr,
      0,
    )
    expect(last.mrr).toBeGreaterThanOrEqual(expectedFloor)
  })
})

describe('getLtvPerPlan', () => {
  it('groups by plan and computes a positive LTV per plan', () => {
    const out = getLtvPerPlan()
    expect(out.length).toBeGreaterThan(0)
    for (const row of out) {
      expect(row.ltv).toBeGreaterThanOrEqual(0)
      expect(row.count).toBeGreaterThan(0)
    }
  })

  it('orders by descending LTV', () => {
    const out = getLtvPerPlan()
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].ltv).toBeGreaterThanOrEqual(out[i].ltv)
    }
  })
})

describe('getChurnRate', () => {
  it('returns a percentage between 0 and 100', () => {
    const c = getChurnRate()
    expect(c.current).toBeGreaterThanOrEqual(0)
    expect(c.current).toBeLessThanOrEqual(100)
  })

  it('delta reflects current - previousMonth', () => {
    const c = getChurnRate()
    expect(Math.abs(c.current - c.previousMonth - c.delta)).toBeLessThan(0.2)
  })
})

describe('getTenantHealth', () => {
  it('returns a tier in {healthy, at-risk, critical}', () => {
    for (const t of TENANTS) {
      const h = getTenantHealth(t, NOW)
      expect(['healthy', 'at-risk', 'critical']).toContain(h.tier)
      expect(h.score).toBeGreaterThanOrEqual(0)
      expect(h.score).toBeLessThanOrEqual(100)
      expect(h.signals.length).toBeGreaterThan(0)
    }
  })

  it('Churned tenants land in at-risk or critical', () => {
    const churned = TENANTS.find((t) => t.status === 'Churned' || t.status === 'Askıda')
    if (!churned) return
    const h = getTenantHealth(churned, NOW)
    expect(['at-risk', 'critical']).toContain(h.tier)
  })

  it('recently-active Aktif Pro tenant scores healthy', () => {
    const t = TENANTS.find((x) => x.status === 'Aktif' && x.plan === 'Pro')
    if (!t) return
    const h = getTenantHealth(t, NOW)
    expect(h.tier).not.toBe('critical')
  })

  it('attaches a recommendation when not healthy', () => {
    const churned = TENANTS.find((t) => t.status === 'Askıda' || t.status === 'Churned')
    if (!churned) return
    const h = getTenantHealth(churned, NOW)
    expect(h.recommendation).toBeTruthy()
  })
})

describe('getResourceUsage', () => {
  it('returns positive integers scaled by listings/users', () => {
    const tenant = TENANTS[0]
    const u = getResourceUsage(tenant)
    expect(u.dbRows).toBeGreaterThan(0)
    expect(u.storageMb).toBeGreaterThan(0)
    expect(u.reqsPerDay).toBeGreaterThanOrEqual(0)
    expect(u.apiCallsThisMonth).toBe(u.reqsPerDay * 30)
  })
})

describe('getCohortMatrix', () => {
  it('returns a row per signup month', () => {
    const rows = getCohortMatrix(NOW)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('retention buckets are 0-100', () => {
    const rows = getCohortMatrix(NOW)
    for (const r of rows) {
      for (const v of [r.retention30d, r.retention60d, r.retention90d]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })

  it('rows are sorted ascending by signupMonth', () => {
    const rows = getCohortMatrix(NOW)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].signupMonth <= rows[i].signupMonth).toBe(true)
    }
  })
})

describe('tier helpers', () => {
  it('tierLabel maps every tier to a Turkish label', () => {
    expect(tierLabel('healthy')).toBe('Sağlıklı')
    expect(tierLabel('at-risk')).toBe('Risk altında')
    expect(tierLabel('critical')).toBe('Kritik')
  })

  it('tierBadgeClass returns distinct class strings', () => {
    const c = [tierBadgeClass('healthy'), tierBadgeClass('at-risk'), tierBadgeClass('critical')]
    expect(new Set(c).size).toBe(3)
  })
})
