// Wave F20.B — Revenue KPI row.
//
// Four token-only KpiCard tiles summarising the platform book:
//   1. Toplam MRR  (current month + delta vs previous month)
//   2. ARR         (MRR × 12)
//   3. Aktif tenant (count, delta = current − previous active count is
//      not derivable from the synthetic series so we omit it and use a
//      neutral hint instead — keeps the card honest)
//   4. Churn rate  (% with delta arrow from `getChurnRate`)
//
// Inputs are 12-month `MonthlyRevenue[]` + a `ChurnSnapshot` from the
// F20.0 analytics lib (super-admin-tenant-analytics). No data fetching
// happens here — the route owns memoisation.

import { Banknote, Calendar, Users, TrendingDown } from '@landx/icons'
import { formatTLCompact } from '@landx/ui'
import { KpiCard } from '@/components/overview/KpiCard'
import type {
  ChurnSnapshot,
  MonthlyRevenue,
} from '@/lib/super-admin-tenant-analytics'

export interface RevenueKpisProps {
  history: readonly MonthlyRevenue[]
  churn: ChurnSnapshot
  activeTenantCount: number
}

export function RevenueKpis({ history, churn, activeTenantCount }: RevenueKpisProps) {
  const last = history[history.length - 1]
  const prev = history.length > 1 ? history[history.length - 2] : undefined
  const mrr = last?.mrr ?? 0
  const prevMrr = prev?.mrr ?? 0
  const mrrDelta = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0
  const arr = mrr * 12
  const mrrSeries = history.map((h) => h.mrr)

  // Churn delta is signed: positive = more churn (bad). We pass the raw
  // signed value so the KpiCard arrow direction is honest, then format
  // a Turkish label with explicit sign + pp suffix.
  const churnDelta = churn.delta
  const churnDeltaLabel = `${churnDelta > 0 ? '+' : churnDelta < 0 ? '' : '±'}${churnDelta.toFixed(1)}pp`

  return (
    <section
      data-testid="revenue-kpis"
      className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
    >
      <div data-testid="revenue-kpi-mrr">
        <KpiCard
          icon={Banknote}
          label="Toplam MRR"
          value={formatTLCompact(mrr)}
          hint={prev ? 'önceki aya göre' : 'bu ay'}
          delta={Number(mrrDelta.toFixed(1))}
          deltaLabel={`${mrrDelta >= 0 ? '+' : ''}${mrrDelta.toFixed(1)}%`}
          series={mrrSeries}
          sparklineLabel="12 ay MRR eğilimi"
        />
      </div>
      <div data-testid="revenue-kpi-arr">
        <KpiCard
          icon={Calendar}
          label="ARR"
          value={formatTLCompact(arr)}
          hint="MRR × 12"
        />
      </div>
      <div data-testid="revenue-kpi-active">
        <KpiCard
          icon={Users}
          label="Aktif tenant"
          value={String(activeTenantCount)}
          hint="abonelik durumu Aktif"
        />
      </div>
      <div data-testid="revenue-kpi-churn">
        <KpiCard
          icon={TrendingDown}
          label="Churn oranı"
          value={`${churn.current.toFixed(1)}%`}
          hint={`önceki ay ${churn.previousMonth.toFixed(1)}%`}
          delta={churnDelta}
          deltaLabel={churnDeltaLabel}
        />
      </div>
    </section>
  )
}

export default RevenueKpis
