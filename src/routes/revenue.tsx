// Wave F20.B — /revenue dashboard.
//
// Composes the F20.0 analytics lib (`super-admin-tenant-analytics`) +
// chart-export helpers (F12) into a single MRR/ARR + churn + LTV view.
// Lazy-mounted via main.tsx route registration (F20.0). No localStorage
// or fetch — the route is a pure projection over TENANTS mock data, so
// reloads are deterministic.

import { useMemo } from 'react'
import { Download } from '@landx/icons'
import { PageShell } from '@landx/ui'
import { TENANTS } from '@landx/data'
import {
  getChurnRate,
  getLtvPerPlan,
  getRevenueHistory,
} from '@/lib/super-admin-tenant-analytics'
import {
  downloadCsv,
  toCsv,
  todayStamp,
} from '@/lib/super-admin-chart-export'
import { RevenueKpis } from '@/components/revenue/RevenueKpis'
import { RevenueTrendChart } from '@/components/revenue/RevenueTrendChart'
import { ChurnWaterfall } from '@/components/revenue/ChurnWaterfall'
import { LtvByPlanCard } from '@/components/revenue/LtvByPlanCard'

export function Revenue() {
  const history = useMemo(() => getRevenueHistory(12), [])
  const churn = useMemo(() => getChurnRate(), [])
  const ltvRows = useMemo(() => getLtvPerPlan(), [])
  const activeTenantCount = useMemo(
    () => TENANTS.filter((t) => t.status === 'Aktif').length,
    [],
  )

  function handleExportCsv() {
    const csv = toCsv(history, [
      { key: 'month', label: 'month' },
      { key: 'mrr', label: 'mrr' },
      { key: 'arr', label: 'arr' },
      { key: 'newMrr', label: 'new_mrr' },
      { key: 'expansionMrr', label: 'expansion_mrr' },
      { key: 'churnedMrr', label: 'churned_mrr' },
    ])
    downloadCsv(`gelir_${todayStamp()}.csv`, csv)
  }

  return (
    <PageShell
      eyebrow="OPS · GELIR"
      title={
        <>
          Gelir{' '}
          <em className="font-serif italic font-light text-muted-foreground">analitiği</em>
        </>
      }
      description="MRR/ARR trendi, churn dökümü, plan başına LTV."
      actions={
        <button
          type="button"
          onClick={handleExportCsv}
          data-testid="revenue-export-csv"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground hover:bg-foreground/[0.04]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          CSV indir
        </button>
      }
    >
      <RevenueKpis
        history={history}
        churn={churn}
        activeTenantCount={activeTenantCount}
      />

      <div className="mb-6">
        <RevenueTrendChart data={history} />
      </div>

      <div className="mb-6">
        <ChurnWaterfall history={history} months={6} />
      </div>

      <LtvByPlanCard rows={ltvRows} />
    </PageShell>
  )
}

export default Revenue
