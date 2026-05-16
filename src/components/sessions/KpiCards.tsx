// Wave F12.A — Session KPI cards.
import { Activity, Clock, Layers, Radio } from '@landx/icons'
import { type SessionKpis } from '@/lib/platform-sessions'

const COUNT_FMT = new Intl.NumberFormat('tr-TR')

function formatDurationMs(ms: number): string {
  if (ms <= 0) return '—'
  const min = Math.floor(ms / 60_000)
  if (min < 1) return `${Math.round(ms / 1000)}s`
  if (min < 60) return `${min}d`
  const hr = Math.floor(min / 60)
  const rem = min % 60
  return rem > 0 ? `${hr}sa ${rem}d` : `${hr}sa`
}

export interface KpiCardsProps {
  kpis: SessionKpis
}

export default function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <section
      className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
      data-testid="sessions-kpi-cards"
    >
      <Card
        icon={Radio}
        label="Şu an aktif"
        value={String(kpis.activeNow)}
        hint="canlı oturum"
        testId="sessions-kpi-active"
      />
      <Card
        icon={Layers}
        label="Toplam oturum"
        value={COUNT_FMT.format(kpis.totalSessions)}
        hint="seçili aralık"
        testId="sessions-kpi-total"
      />
      <Card
        icon={Clock}
        label="Ortalama süre"
        value={formatDurationMs(kpis.avgDurationMs)}
        hint="başlangıç → bitiş"
        testId="sessions-kpi-avg-duration"
      />
      <Card
        icon={Activity}
        label="Toplam eylem"
        value={COUNT_FMT.format(kpis.totalActions)}
        hint="tüm oturumlar"
        testId="sessions-kpi-actions"
      />
    </section>
  )
}

function Card({
  icon: Icon,
  label,
  value,
  hint,
  testId,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
  testId: string
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4" data-testid={testId}>
      <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/[0.06]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}
