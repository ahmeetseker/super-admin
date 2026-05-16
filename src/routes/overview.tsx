// Super-admin Overview — Wave F3 / Agent-F3D.
//
// Real KPI dashboard for the platform index route. Pulls live data from
// the existing platform query hooks (useTenants, useAuditLog) and falls
// back to overview-metrics mocks for the MAU + revenue + SLO series
// (no metrics endpoint yet). Token-only chart + chip styling.

import { useMemo } from 'react'
import { Activity, Building2, TrendingUp, Users } from '@landx/icons'
import { PageShell, formatTLCompact } from '@landx/ui'
import {
  useAuditLog,
  useTenants,
  MAU_HISTORY,
  MONTHLY_REVENUE,
  SLO_DAILY,
  SLO_UPTIME_30D,
  INCIDENTS,
  ACTIVE_ALERTS_COUNT,
  KPI_DELTAS,
} from '@landx/data'

import { KpiCard } from '@/components/overview/KpiCard'
import { LiveActivityFeed } from '@/components/overview/LiveActivityFeed'
import { RecentAuditFeed } from '@/components/overview/RecentAuditFeed'
import { RevenueChart } from '@/components/overview/RevenueChart'
import { SystemHealth } from '@/components/overview/SystemHealth'
import { TopTenantsTable } from '@/components/overview/TopTenantsTable'

const UPTIME_FMT = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

export function Overview() {
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants({})
  const { data: auditPage, isLoading: auditLoading } = useAuditLog({ pageSize: 8 })

  const recentAudit = useMemo(() => (auditPage?.data ?? []).slice(0, 8), [auditPage])
  const activeTenants = useMemo(
    () => tenants.filter((t) => t.status === 'Aktif').length,
    [tenants],
  )
  const topTenants = useMemo(
    () => [...tenants].sort((a, b) => b.mrr - a.mrr).slice(0, 5),
    [tenants],
  )

  const currentMau = MAU_HISTORY[MAU_HISTORY.length - 1]?.mau ?? 0
  const currentRevenue = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 1]?.revenue ?? 0

  // KPI sparkline series (chronological). Active-tenants doesn't have a
  // real time series, so we synthesise a smooth ramp from the current
  // count to give the card visual parity with the other three.
  const tenantsSpark = useMemo(() => {
    const target = activeTenants || 1
    return Array.from({ length: 8 }, (_, i) =>
      Math.max(1, Math.round(target - (7 - i) * 0.5)),
    )
  }, [activeTenants])
  const mauSpark = MAU_HISTORY.map((p) => p.mau)
  const revenueSpark = MONTHLY_REVENUE.map((p) => p.revenue)
  const sloSpark = SLO_DAILY.map((p) => p.uptime * 100)

  // Newest incident first — observability seed orders by date already.
  const lastIncident = INCIDENTS[0] ?? null

  return (
    <PageShell
      eyebrow="MOD · OVERVIEW"
      title={
        <>
          Platform <em className="font-serif italic font-light">durumu</em>
        </>
      }
      description={`${activeTenants} aktif tenant · ${currentMau} MAU · ${formatTLCompact(
        currentRevenue,
      )} bu ay · ${UPTIME_FMT.format(SLO_UPTIME_30D * 100)}% SLO.`}
    >
      <section
        data-testid="overview-kpi-row"
        className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <KpiCard
          icon={Building2}
          label="Aktif tenant"
          value={String(activeTenants)}
          delta={KPI_DELTAS.activeTenantsDelta}
          deltaLabel={
            KPI_DELTAS.activeTenantsDelta >= 0
              ? `+${KPI_DELTAS.activeTenantsDelta}`
              : String(KPI_DELTAS.activeTenantsDelta)
          }
          hint="son 14g"
          series={tenantsSpark}
          sparklineLabel="Aktif tenant sayısı eğilimi"
        />
        <KpiCard
          icon={Users}
          label="MAU"
          value={String(currentMau)}
          delta={KPI_DELTAS.mauDeltaPct}
          deltaLabel={`${KPI_DELTAS.mauDeltaPct >= 0 ? '+' : ''}${KPI_DELTAS.mauDeltaPct.toFixed(1)}%`}
          hint="4 hafta öncesine göre"
          series={mauSpark}
          sparklineLabel="12 haftalık MAU eğilimi"
        />
        <KpiCard
          icon={TrendingUp}
          label="Bu ay ciro"
          value={formatTLCompact(currentRevenue)}
          delta={KPI_DELTAS.revenueDeltaPct}
          deltaLabel={`${KPI_DELTAS.revenueDeltaPct >= 0 ? '+' : ''}${KPI_DELTAS.revenueDeltaPct.toFixed(1)}%`}
          hint="önceki ay"
          series={revenueSpark}
          sparklineLabel="12 aylık ciro eğilimi"
        />
        <KpiCard
          icon={Activity}
          label="SLO uptime"
          value={`${UPTIME_FMT.format(SLO_UPTIME_30D * 100)}%`}
          delta={KPI_DELTAS.sloDeltaPct}
          deltaLabel={`${KPI_DELTAS.sloDeltaPct >= 0 ? '+' : ''}${KPI_DELTAS.sloDeltaPct.toFixed(2)}p`}
          hint="son 30g · baz 99.91%"
          series={sloSpark}
          sparklineLabel="30 günlük SLO uptime eğilimi"
        />
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-[1fr_400px]">
        <RevenueChart data={MONTHLY_REVENUE} />
        <TopTenantsTable rows={topTenants} loading={tenantsLoading} />
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <RecentAuditFeed entries={recentAudit} loading={auditLoading} />
        </div>
        <div className="space-y-4 lg:col-span-4">
          <SystemHealth
            uptime30d={SLO_UPTIME_30D}
            activeAlerts={ACTIVE_ALERTS_COUNT}
            lastIncident={lastIncident}
          />
          <LiveActivityFeed />
        </div>
      </section>
    </PageShell>
  )
}
