/**
 * /slo-budget — Wave F35 / Faz 2.
 *
 * SLO Error Budget burndown — 6 service grid card. Her kart: target/current
 * uptime, kalan budget %, mini bar chart son 30 gün uptime trend, alert
 * sayıları. Aktif alarmlar tablosu altta.
 */
import { useMemo } from 'react'
import { AlertTriangle, AlertOctagon, Activity } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { useAdminSloMetrics, type AdminSloAlert, type AdminSloMetric } from '@landx/data'

function budgetTone(pct: number): { bar: string; bg: string; text: string } {
  if (pct >= 80)
    return {
      bar: 'bg-emerald-500',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-300',
    }
  if (pct >= 40)
    return {
      bar: 'bg-amber-500',
      bg: 'bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-300',
    }
  return {
    bar: 'bg-rose-500',
    bg: 'bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-300',
  }
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

function MiniTrendBar({ metric }: { metric: AdminSloMetric }) {
  // Trend uptime'ları → 0-1 normalleştirip bar yüksekliği üret.
  const points = metric.trend
  const minU = Math.min(...points.map((p) => p.uptime))
  const maxU = Math.max(...points.map((p) => p.uptime))
  const range = Math.max(maxU - minU, 0.0001)
  const tone = budgetTone(metric.budgetRemainingPct)
  return (
    <div className="flex h-10 items-end gap-[2px]">
      {points.map((p) => {
        const norm = (p.uptime - minU) / range
        const h = Math.max(2, Math.round(norm * 32 + 4))
        const isLow = p.uptime < metric.targetUptime
        return (
          <div
            key={p.date}
            className={cn(
              'w-[3px] flex-none rounded-sm opacity-70',
              isLow ? 'bg-rose-500' : tone.bar,
            )}
            style={{ height: `${h}px` }}
            title={`${p.date.slice(0, 10)} · ${(p.uptime * 100).toFixed(2)}%`}
          />
        )
      })}
    </div>
  )
}

interface FlatAlert extends AdminSloAlert {
  service: string
}

export function SloBudget() {
  const { data: metrics = [], isPending } = useAdminSloMetrics()

  const flatAlerts = useMemo<FlatAlert[]>(() => {
    const flat: FlatAlert[] = []
    for (const m of metrics) {
      for (const a of m.alerts) {
        flat.push({ ...a, service: m.service })
      }
    }
    flat.sort((a, b) => (a.at < b.at ? 1 : -1))
    return flat
  }, [metrics])

  const totalAlerts = flatAlerts.length
  const critCount = flatAlerts.filter((a) => a.level === 'crit').length

  return (
    <PageShell
      eyebrow="MOD · O01 · SLO"
      title={
        <>
          Error <em className="font-serif italic font-light">budget</em>
        </>
      }
      description={`${metrics.length} servis · ${totalAlerts} aktif alarm (${critCount} kritik). Mini bar chart son 30 gün uptime trendi.`}
    >
      {isPending && metrics.length === 0 ? (
        <div className="grid h-[40vh] place-items-center text-sm text-muted-foreground">
          Metrics yükleniyor…
        </div>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((m) => {
              const tone = budgetTone(m.budgetRemainingPct)
              const warns = m.alerts.filter((a) => a.level === 'warn').length
              const crits = m.alerts.filter((a) => a.level === 'crit').length
              return (
                <article
                  key={m.service}
                  className="rounded-2xl border border-border bg-card p-4"
                  data-testid={`slo-card-${m.service}`}
                >
                  <header className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Servis
                      </div>
                      <div className="font-serif text-base">{m.service}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {warns > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          {warns}
                        </span>
                      )}
                      {crits > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                          <AlertOctagon className="h-3 w-3" />
                          {crits}
                        </span>
                      )}
                      {warns === 0 && crits === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                          temiz
                        </span>
                      )}
                    </div>
                  </header>

                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Hedef
                      </div>
                      <div className="font-serif text-xl font-light tabular-nums">
                        {(m.targetUptime * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Şu an
                      </div>
                      <div
                        className={cn(
                          'font-serif text-xl font-light tabular-nums',
                          m.currentUptime >= m.targetUptime
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-rose-700 dark:text-rose-300',
                        )}
                      >
                        {(m.currentUptime * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Budget kalan
                      </span>
                      <span
                        className={cn('font-mono text-[11px] font-semibold tabular-nums', tone.text)}
                      >
                        %{m.budgetRemainingPct}
                      </span>
                    </div>
                    <div className={cn('h-2 w-full overflow-hidden rounded-full', tone.bg)}>
                      <div
                        className={cn('h-full rounded-full transition-all', tone.bar)}
                        style={{ width: `${Math.max(2, Math.min(100, m.budgetRemainingPct))}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Son 30 gün
                    </div>
                    <MiniTrendBar metric={m} />
                  </div>
                </article>
              )
            })}
          </section>

          <section>
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Aktif alarmlar
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="px-4 py-2.5">Servis</th>
                      <th className="px-4 py-2.5">Seviye</th>
                      <th className="px-4 py-2.5">Mesaj</th>
                      <th className="px-4 py-2.5">Zaman</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatAlerts.map((a, i) => (
                      <tr
                        key={`${a.service}-${i}`}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-4 py-2.5 align-top text-[13px]">{a.service}</td>
                        <td className="px-4 py-2.5 align-top">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                              a.level === 'crit'
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
                            )}
                          >
                            {a.level === 'crit' ? (
                              <AlertOctagon className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {a.level}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 align-top text-[13px] text-foreground/80">
                          {a.message}
                        </td>
                        <td
                          className="px-4 py-2.5 align-top font-mono text-[11px] text-muted-foreground"
                          title={a.at}
                        >
                          {formatRelative(a.at)}
                        </td>
                      </tr>
                    ))}
                    {flatAlerts.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-sm text-muted-foreground"
                        >
                          <Activity className="mx-auto mb-2 h-4 w-4" />
                          Aktif alarm yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </PageShell>
  )
}
