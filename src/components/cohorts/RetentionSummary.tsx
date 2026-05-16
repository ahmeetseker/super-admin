// Wave F20.C — Retention summary KPI strip.
//
// Aggregates the cohort matrix into four headline metrics (30d/60d/90d
// weighted average retention + risk count), then renders them via the
// shared KpiCard so the visual rhythm matches the Overview dashboard.

import { useMemo } from 'react'
import { CalendarDays, ShieldAlert, Target, TrendingDown } from '@landx/icons'
import type { Tenant } from '@landx/data'
import { KpiCard } from '@/components/overview/KpiCard'
import {
  getTenantHealth,
  type CohortRow,
} from '@/lib/super-admin-tenant-analytics'

interface RetentionSummaryProps {
  rows: readonly CohortRow[]
  tenants: readonly Tenant[]
  now?: number
}

/** Cohort-size-weighted average across rows. */
export function weightedRetention(
  rows: readonly CohortRow[],
  field: 'retention30d' | 'retention60d' | 'retention90d',
): number {
  if (rows.length === 0) return 0
  let weightedSum = 0
  let totalSize = 0
  for (const r of rows) {
    weightedSum += r[field] * r.size
    totalSize += r.size
  }
  if (totalSize === 0) return 0
  return Math.round((weightedSum / totalSize) * 10) / 10
}

export function countAtRisk(
  tenants: readonly Tenant[],
  now?: number,
): { atRisk: number; critical: number } {
  let atRisk = 0
  let critical = 0
  for (const t of tenants) {
    const h = getTenantHealth(t, now)
    if (h.tier === 'at-risk') atRisk++
    else if (h.tier === 'critical') critical++
  }
  return { atRisk, critical }
}

export function RetentionSummary({ rows, tenants, now }: RetentionSummaryProps) {
  const metrics = useMemo(
    () => ({
      r30: weightedRetention(rows, 'retention30d'),
      r60: weightedRetention(rows, 'retention60d'),
      r90: weightedRetention(rows, 'retention90d'),
      risk: countAtRisk(tenants, now),
    }),
    [rows, tenants, now],
  )

  const totalRisk = metrics.risk.atRisk + metrics.risk.critical

  return (
    <section
      data-testid="retention-summary"
      aria-label="Retention özeti"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div data-testid="retention-kpi-30d">
        <KpiCard
          icon={Target}
          label="30 gün retention"
          value={`${metrics.r30}%`}
          hint="Cohort ağırlıklı ortalama"
        />
      </div>
      <div data-testid="retention-kpi-60d">
        <KpiCard
          icon={CalendarDays}
          label="60 gün retention"
          value={`${metrics.r60}%`}
          hint="Cohort ağırlıklı ortalama"
        />
      </div>
      <div data-testid="retention-kpi-90d">
        <KpiCard
          icon={TrendingDown}
          label="90 gün retention"
          value={`${metrics.r90}%`}
          hint="Cohort ağırlıklı ortalama"
        />
      </div>
      <div data-testid="retention-kpi-risk">
        <KpiCard
          icon={ShieldAlert}
          label="Risk altındaki tenant"
          value={String(totalRisk)}
          hint={`${metrics.risk.critical} kritik · ${metrics.risk.atRisk} risk`}
        />
      </div>
    </section>
  )
}

export default RetentionSummary
