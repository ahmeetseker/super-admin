// Wave F12.A — /ops/sessions route. Time range + filters + pie chart + list + drawer + CSV/PNG export.
import { useMemo, useRef, useState } from 'react'
import { Download, Image as ImageIcon, RefreshCw } from '@landx/icons'
import { PageShell } from '@landx/ui'
import { TENANTS } from '@landx/data'
import KpiCards from '@/components/sessions/KpiCards'
import StatusPie from '@/components/sessions/StatusPie'
import SessionList from '@/components/sessions/SessionList'
import SessionDrawer from '@/components/sessions/SessionDrawer'
import TimeRangePicker from '@/components/shared/TimeRangePicker'
import {
  ACTOR_TYPE_LABEL,
  STATUS_LABEL,
  computeSessionKpis,
  getPlatformSessions,
  statusBreakdown,
  type PlatformActorType,
  type PlatformSession,
  type PlatformSessionStatus,
} from '@/lib/platform-sessions'
import { createPresetRange, inRange, type TimeRange } from '@/lib/super-admin-time-range'
import {
  downloadCsv,
  downloadSvgAsPng,
  toCsv,
  todayStamp,
} from '@/lib/super-admin-chart-export'

export function Sessions() {
  const [range, setRange] = useState<TimeRange>(() => createPresetRange('7d'))
  const [status, setStatus] = useState<'all' | PlatformSessionStatus>('all')
  const [actorType, setActorType] = useState<'all' | PlatformActorType>('all')
  const [tenantId, setTenantId] = useState<string>('all')
  const [refreshTick, setRefreshTick] = useState(0)
  const [openSession, setOpenSession] = useState<PlatformSession | null>(null)

  const svgRef = useRef<SVGSVGElement | null>(null)

  const allSessions = useMemo(() => getPlatformSessions(), [])

  const filtered = useMemo(() => {
    return allSessions.filter((s) => {
      if (!inRange(s.startedAt, range)) return false
      if (status !== 'all' && s.status !== status) return false
      if (actorType !== 'all' && s.actorType !== actorType) return false
      if (tenantId !== 'all' && s.tenantId !== tenantId) return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSessions, range, status, actorType, tenantId, refreshTick])

  const kpis = useMemo(() => computeSessionKpis(filtered), [filtered])
  const slices = useMemo(() => statusBreakdown(filtered), [filtered])

  function handleExportCsv() {
    const csv = toCsv(filtered, [
      { key: 'id', label: 'id' },
      { key: 'actorName', label: 'actor_name' },
      { key: 'actorId', label: 'actor_id' },
      { key: 'actorType', label: 'actor_type' },
      { key: 'tenantId', label: 'tenant' },
      { key: 'status', label: 'status' },
      {
        key: 'startedAt',
        label: 'started_at',
        getValue: (s) => new Date(s.startedAt).toISOString(),
      },
      {
        key: 'endedAt',
        label: 'ended_at',
        getValue: (s) => (s.endedAt ? new Date(s.endedAt).toISOString() : ''),
      },
      { key: 'actionCount', label: 'action_count' },
    ])
    downloadCsv(`sessions-${todayStamp()}.csv`, csv)
  }

  function handleExportPng() {
    if (svgRef.current) {
      void downloadSvgAsPng(svgRef.current, `sessions-status-${todayStamp()}.png`)
    }
  }

  return (
    <PageShell
      eyebrow="MOD · A11 · CONVERSATION SESSIONS"
      title={
        <>
          Oturum <em className="font-serif italic font-light">geçmişi</em>
        </>
      }
      description={`${filtered.length} oturum · ${kpis.activeNow} aktif · ${kpis.totalActions} eylem.`}
    >
      <KpiCards kpis={kpis} />

      <section
        className="mb-5 flex flex-wrap items-center gap-3"
        data-testid="sessions-filter-bar"
      >
        <TimeRangePicker value={range} onChange={setRange} testId="sessions-range" />
        <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Durum</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | PlatformSessionStatus)}
            className="bg-transparent text-[12px] font-medium text-foreground/90 outline-none"
            data-testid="sessions-status"
          >
            <option value="all">Tümü</option>
            <option value="active">{STATUS_LABEL.active}</option>
            <option value="expired">{STATUS_LABEL.expired}</option>
            <option value="revoked">{STATUS_LABEL.revoked}</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Aktör</span>
          <select
            value={actorType}
            onChange={(e) => setActorType(e.target.value as 'all' | PlatformActorType)}
            className="bg-transparent text-[12px] font-medium text-foreground/90 outline-none"
            data-testid="sessions-actor"
          >
            <option value="all">Tümü</option>
            <option value="user">{ACTOR_TYPE_LABEL.user}</option>
            <option value="service">{ACTOR_TYPE_LABEL.service}</option>
            <option value="agent">{ACTOR_TYPE_LABEL.agent}</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Kiracı</span>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="bg-transparent text-[12px] font-medium text-foreground/90 outline-none"
            data-testid="sessions-tenant"
          >
            <option value="all">Tümü</option>
            {TENANTS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setRefreshTick((t) => t + 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-[12px] font-medium hover:bg-foreground/[0.04]"
          data-testid="sessions-refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Yenile
        </button>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-[12px] font-medium hover:bg-foreground/[0.04]"
          data-testid="sessions-export-csv"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
        <button
          type="button"
          onClick={handleExportPng}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-[12px] font-medium hover:bg-foreground/[0.04]"
          data-testid="sessions-export-png"
        >
          <ImageIcon className="h-3.5 w-3.5" /> PNG
        </button>
        <span
          className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          data-testid="sessions-count"
        >
          {filtered.length} / {allSessions.length}
        </span>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <StatusPie ref={svgRef} slices={slices} />
        <SessionList sessions={filtered} onOpen={setOpenSession} />
      </section>

      <SessionDrawer session={openSession} onClose={() => setOpenSession(null)} />
    </PageShell>
  )
}
