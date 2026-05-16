import { Activity, AlertTriangle, Clock, Gauge } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  SERVICE_HEALTH,
  INCIDENTS,
  OVERALL_UPTIME,
  MAX_P95,
  MTTR_MIN,
  type Incident,
  type ServiceHealth,
} from '@landx/data'

const SEVERITY_TONE: Record<Incident['severity'], string> = {
  SEV1: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-400/10 ring-rose-500/20',
  SEV2: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-400/10 ring-amber-500/20',
  SEV3: 'text-sky-700 dark:text-sky-300 bg-sky-500/10 dark:bg-sky-400/10 ring-sky-500/20',
}

function uptimeTone(uptime: number): { dot: string; text: string } {
  if (uptime >= 99.9) return { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' }
  if (uptime >= 99.5) return { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' }
  return { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300' }
}

function latencyTone(p95: number): string {
  if (p95 <= 200) return 'text-emerald-700 dark:text-emerald-300'
  if (p95 <= 500) return 'text-amber-700 dark:text-amber-300'
  return 'text-rose-700 dark:text-rose-300'
}

function formatStarted(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function Observability() {
  const sev1Count = INCIDENTS.filter((i) => i.severity === 'SEV1').length
  const totalIncidents = INCIDENTS.length

  return (
    <PageShell
      eyebrow="MOD · OBSERVABILITY"
      title={
        <>
          Servis <em className="font-serif italic font-light">sağlığı</em>
        </>
      }
      description={`6 mikro-servis · ${OVERALL_UPTIME.toFixed(2)}% ortalama uptime · son 30 günde ${totalIncidents} olay.`}
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={Activity}
          label="Uptime (30g)"
          value={`${OVERALL_UPTIME.toFixed(2)}%`}
          hint={`hedef ≥ 99.9% (${OVERALL_UPTIME >= 99.9 ? 'OK' : 'aşıldı'})`}
        />
        <Kpi icon={Gauge} label="En yüksek p95" value={`${MAX_P95} ms`} hint="webhook-dispatcher" />
        <Kpi icon={AlertTriangle} label="Olay (bu ay)" value={String(totalIncidents)} hint={`${sev1Count} SEV1`} />
        <Kpi icon={Clock} label="MTTR" value={`${MTTR_MIN} dk`} hint="ortalama çözüm süresi" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ServiceHealthTable rows={SERVICE_HEALTH} />
        <IncidentList incidents={INCIDENTS} />
      </section>
    </PageShell>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/[0.06]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}

function ServiceHealthTable({ rows }: { rows: readonly ServiceHealth[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Servisler</div>
          <div className="font-serif text-base">Sağlık özeti</div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">son 30 gün</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-4 py-2.5">Servis</th>
              <th className="px-4 py-2.5 text-right">Uptime</th>
              <th className="px-4 py-2.5 text-right">Hata</th>
              <th className="px-4 py-2.5 text-right">p50</th>
              <th className="px-4 py-2.5 text-right">p95</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tone = uptimeTone(r.uptime)
              return (
                <tr key={r.service} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className={cn('h-2 w-2 flex-none rounded-full', tone.dot)} />
                      <span className="font-mono text-[12px]">{r.service}</span>
                    </div>
                  </td>
                  <td className={cn('px-4 py-3 text-right font-mono tabular-nums text-[12px]', tone.text)}>
                    {r.uptime.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                    {(r.errorRate * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                    {r.p50} ms
                  </td>
                  <td className={cn('px-4 py-3 text-right font-mono tabular-nums text-[12px]', latencyTone(r.p95))}>
                    {r.p95} ms
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function IncidentList({ incidents }: { incidents: readonly Incident[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Olay zaman çizelgesi</div>
          <div className="font-serif text-base">Son incident'lar</div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{incidents.length} kayıt</span>
      </div>
      <ol className="divide-y divide-border/60">
        {incidents.map((inc) => (
          <li key={inc.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 inline-flex flex-none items-center rounded-full px-2 py-0.5 font-mono text-[10px] ring-1',
                  SEVERITY_TONE[inc.severity],
                )}
              >
                {inc.severity}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[11px] text-muted-foreground">{inc.id}</span>
                  <span className="font-mono text-[11px] text-foreground/80">{inc.service}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">·</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{formatStarted(inc.startedISO)}</span>
                  {inc.durationMin !== null && (
                    <>
                      <span className="font-mono text-[10px] text-muted-foreground">·</span>
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{inc.durationMin} dk</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-[13px] leading-snug text-foreground/85">{inc.summary}</p>
              </div>
              <span
                className={cn(
                  'mt-0.5 flex-none rounded-full px-2 py-0.5 font-mono text-[10px]',
                  inc.resolvedISO ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
                )}
              >
                {inc.resolvedISO ? 'Çözüldü' : 'Açık'}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
