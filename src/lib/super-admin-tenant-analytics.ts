/**
 * Wave F20.0 — Tenant analytics derived from the TENANTS mock seed.
 *
 * All helpers are pure functions over the seed data — no localStorage,
 * no network. Revenue history is synthetic but deterministic (seeded by
 * each tenant's createdISO + plan + status), so reloads + tests yield
 * identical curves.
 *
 * When real billing data lands, swap the `getRevenueHistory` /
 * `getCohortMatrix` implementations and leave consumer components intact.
 */

import { TENANTS, type Tenant } from '@landx/data'

const MONTH_MS = 30 * 86_400_000
const DAY_MS = 86_400_000

export interface MonthlyRevenue {
  month: string // YYYY-MM
  mrr: number
  arr: number
  newMrr: number
  churnedMrr: number
  expansionMrr: number
}

export interface TenantHealthSignal {
  label: string
  weight: number
}

export interface TenantHealth {
  score: number
  tier: 'healthy' | 'at-risk' | 'critical'
  signals: TenantHealthSignal[]
  recommendation?: string
}

export interface TenantResourceUsage {
  dbRows: number
  storageMb: number
  reqsPerDay: number
  apiCallsThisMonth: number
}

export interface LtvByPlan {
  plan: Tenant['plan']
  count: number
  meanMrr: number
  ltv: number
}

export interface ChurnSnapshot {
  current: number
  previousMonth: number
  delta: number
}

export interface CohortRow {
  signupMonth: string // YYYY-MM
  size: number
  retention30d: number
  retention60d: number
  retention90d: number
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseISO(iso: string): number {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? Date.now() : t
}

/**
 * Synthesise N months of MRR history. Each tenant joins the active book
 * after createdISO and drops out if status indicates churn — synthetic
 * but deterministic.
 */
export function getRevenueHistory(months = 12, now = Date.now()): MonthlyRevenue[] {
  const out: MonthlyRevenue[] = []
  const start = new Date(now)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  start.setMonth(start.getMonth() - (months - 1))

  let previousMrr = 0

  for (let i = 0; i < months; i++) {
    const month = new Date(start)
    month.setMonth(start.getMonth() + i)
    const cutoff = month.getTime()
    const nextCutoff = cutoff + MONTH_MS

    let mrr = 0
    let newMrr = 0
    let churned = 0

    for (const tenant of TENANTS) {
      const created = parseISO(tenant.createdISO)
      const lastActive = parseISO(tenant.lastActiveISO)

      if (created > nextCutoff) continue

      const isChurned = tenant.status === 'Churned' || tenant.status === 'Askıda'
      const churnedThisMonth = isChurned && lastActive >= cutoff && lastActive < nextCutoff

      if (created >= cutoff && created < nextCutoff) {
        newMrr += tenant.mrr
      }

      if (churnedThisMonth) {
        churned += tenant.mrr
        continue
      }

      if (!isChurned || lastActive >= cutoff) {
        mrr += tenant.mrr
      }
    }

    const expansion = Math.max(0, mrr - previousMrr - newMrr + churned)
    out.push({
      month: monthKey(month),
      mrr,
      arr: mrr * 12,
      newMrr,
      churnedMrr: churned,
      expansionMrr: expansion,
    })
    previousMrr = mrr
  }

  return out
}

export function getLtvPerPlan(): LtvByPlan[] {
  const churnRate = Math.max(0.01, getChurnRate().current / 100)
  const groups = new Map<Tenant['plan'], { mrrSum: number; count: number }>()

  for (const t of TENANTS) {
    const bucket = groups.get(t.plan) ?? { mrrSum: 0, count: 0 }
    bucket.mrrSum += t.mrr
    bucket.count += 1
    groups.set(t.plan, bucket)
  }

  const out: LtvByPlan[] = []
  for (const [plan, { mrrSum, count }] of groups) {
    const meanMrr = count > 0 ? Math.round(mrrSum / count) : 0
    const ltv = Math.round(meanMrr / churnRate)
    out.push({ plan, count, meanMrr, ltv })
  }
  return out.sort((a, b) => b.ltv - a.ltv)
}

export function getChurnRate(): ChurnSnapshot {
  const total = TENANTS.length
  const churned = TENANTS.filter(
    (t) => t.status === 'Churned' || t.status === 'Askıda',
  ).length
  const current = total > 0 ? Math.round((churned / total) * 1000) / 10 : 0
  const previous = Math.max(0, current - 1.4) // synthetic delta
  return {
    current,
    previousMonth: Math.round(previous * 10) / 10,
    delta: Math.round((current - previous) * 10) / 10,
  }
}

export function getTenantHealth(tenant: Tenant, now = Date.now()): TenantHealth {
  const signals: TenantHealthSignal[] = []
  let score = 50

  const daysSinceActive = Math.floor((now - parseISO(tenant.lastActiveISO)) / DAY_MS)
  if (daysSinceActive < 7) {
    score += 25
    signals.push({ label: 'Son 7 günde aktif', weight: 25 })
  } else if (daysSinceActive < 30) {
    score += 10
    signals.push({ label: 'Son 30 günde aktif', weight: 10 })
  } else {
    score -= 20
    signals.push({ label: `${daysSinceActive} gündür aktif değil`, weight: -20 })
  }

  if (tenant.status === 'Aktif') {
    score += 15
    signals.push({ label: 'Aktif abonelik', weight: 15 })
  } else if (tenant.status === 'Trial') {
    score += 5
    signals.push({ label: 'Deneme dönemi', weight: 5 })
  } else if (tenant.status === 'Askıda') {
    score -= 25
    signals.push({ label: 'Askıya alınmış', weight: -25 })
  } else if (tenant.status === 'Churned') {
    score -= 35
    signals.push({ label: 'Churned', weight: -35 })
  }

  if (tenant.listingCount >= 20) {
    score += 10
    signals.push({ label: `${tenant.listingCount} aktif ilan`, weight: 10 })
  } else if (tenant.listingCount < 5) {
    score -= 5
    signals.push({ label: 'Düşük ilan hacmi', weight: -5 })
  }

  if (tenant.userCount >= 5) {
    score += 5
    signals.push({ label: `${tenant.userCount} kullanıcı`, weight: 5 })
  } else if (tenant.userCount < 2) {
    score -= 5
    signals.push({ label: 'Tek kullanıcı', weight: -5 })
  }

  score = Math.max(0, Math.min(100, score))

  const tier: TenantHealth['tier'] =
    score >= 70 ? 'healthy' : score >= 45 ? 'at-risk' : 'critical'

  let recommendation: string | undefined
  if (tier === 'critical') {
    if (tenant.status === 'Trial') recommendation = 'Trial dönüşümü düşük — outreach planla'
    else if (daysSinceActive >= 30) recommendation = 'Pasif tenant — re-engagement kampanyası'
    else recommendation = 'Plan iptali riski — destek temasa geç'
  } else if (tier === 'at-risk') {
    if (tenant.plan === 'Free') recommendation = 'Free → Pro upgrade fırsatı'
    else recommendation = 'Kullanım düşük — başarı ekibinden temas'
  }

  return { score, tier, signals, recommendation }
}

export function getResourceUsage(tenant: Tenant): TenantResourceUsage {
  // Synthetic proxy: each listing ≈ 350 DB rows + 8 MB media; each user ≈ 50 rows + 1 MB
  const dbRows = tenant.listingCount * 350 + tenant.userCount * 50
  const storageMb = tenant.listingCount * 8 + tenant.userCount * 1
  const reqsPerDay = Math.max(0, tenant.listingCount * 18 + tenant.userCount * 42)
  const apiCallsThisMonth = reqsPerDay * 30
  return { dbRows, storageMb, reqsPerDay, apiCallsThisMonth }
}

export function getCohortMatrix(now = Date.now()): CohortRow[] {
  const buckets = new Map<string, Tenant[]>()
  for (const t of TENANTS) {
    const d = new Date(parseISO(t.createdISO))
    const key = monthKey(d)
    const list = buckets.get(key) ?? []
    list.push(t)
    buckets.set(key, list)
  }

  const out: CohortRow[] = []
  for (const [signupMonth, tenants] of buckets) {
    const size = tenants.length
    const r30 = retentionAtDays(tenants, 30, now)
    const r60 = retentionAtDays(tenants, 60, now)
    const r90 = retentionAtDays(tenants, 90, now)
    out.push({
      signupMonth,
      size,
      retention30d: r30,
      retention60d: r60,
      retention90d: r90,
    })
  }
  return out.sort((a, b) => a.signupMonth.localeCompare(b.signupMonth))
}

function retentionAtDays(tenants: Tenant[], days: number, now: number): number {
  if (tenants.length === 0) return 0
  let retained = 0
  for (const t of tenants) {
    const created = parseISO(t.createdISO)
    const age = (now - created) / DAY_MS
    if (age < days) continue
    const isChurned = t.status === 'Churned' || t.status === 'Askıda'
    if (!isChurned) retained++
  }
  // If too young to evaluate, return 100% (insufficient data signal)
  const elderly = tenants.filter((t) => (now - parseISO(t.createdISO)) / DAY_MS >= days).length
  if (elderly === 0) return 100
  return Math.round((retained / elderly) * 1000) / 10
}

export function tierBadgeClass(tier: TenantHealth['tier']): string {
  if (tier === 'healthy') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
  if (tier === 'at-risk') return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  return 'bg-rose-500/10 text-rose-700 border-rose-500/20'
}

export function tierLabel(tier: TenantHealth['tier']): string {
  if (tier === 'healthy') return 'Sağlıklı'
  if (tier === 'at-risk') return 'Risk altında'
  return 'Kritik'
}
