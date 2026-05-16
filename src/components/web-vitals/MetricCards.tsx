// Wave F12.B — MetricCards: 5 Core Web Vitals tiles (INP/CLS/LCP/FCP/TTFB)
// with p50/p75/p95 and a status badge driven by Google's threshold table.
//
// Token-only styling: distinguish green/amber/red via foreground opacity +
// border weight, no raw colour utilities. Matches the existing StatCard tone.

import { cn } from '@landx/ui'
import {
  METRIC_LABEL,
  STATUS_LABEL,
  THRESHOLDS,
  type MetricSummary,
  type VitalMetric,
  type VitalStatus,
} from '@/lib/platform-web-vitals'

const STATUS_CHIP: Record<VitalStatus, string> = {
  green: 'border-foreground/40 bg-foreground/[0.08] text-foreground',
  amber: 'border-foreground/25 bg-foreground/[0.05] text-foreground/80',
  red: 'border-foreground/15 bg-foreground/[0.03] text-foreground/60',
}

const MS_FMT = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })
const SCORE_FMT = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 3,
  minimumFractionDigits: 2,
})

export function formatVitalValue(metric: VitalMetric, value: number): string {
  if (THRESHOLDS[metric].unit === 'score') return SCORE_FMT.format(value)
  return MS_FMT.format(value)
}

export interface MetricCardsProps {
  summaries: MetricSummary[]
}

export function MetricCards({ summaries }: MetricCardsProps) {
  return (
    <section
      className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      data-testid="metric-cards"
    >
      {summaries.map((s) => (
        <MetricCard key={s.metric} summary={s} />
      ))}
    </section>
  )
}

function MetricCard({ summary }: { summary: MetricSummary }) {
  const t = THRESHOLDS[summary.metric]
  return (
    <article
      className="rounded-2xl border border-border bg-card p-4"
      data-testid={`metric-card-${summary.metric}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {summary.metric}
        </span>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]',
            STATUS_CHIP[summary.status],
          )}
          data-testid={`metric-status-${summary.metric}`}
        >
          {STATUS_LABEL[summary.status]}
        </span>
      </div>
      <div className="mt-2 font-serif text-3xl font-light tabular-nums text-foreground">
        {formatVitalValue(summary.metric, summary.p75)}
        {t.unit === 'ms' && (
          <span className="ml-1 font-mono text-[11px] text-muted-foreground">ms</span>
        )}
      </div>
      <div className="mt-1 text-[12px] text-muted-foreground">
        {METRIC_LABEL[summary.metric]}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-2 text-[11px]">
        <PercentileCell label="p50" value={summary.p50} metric={summary.metric} />
        <PercentileCell label="p75" value={summary.p75} metric={summary.metric} highlight />
        <PercentileCell label="p95" value={summary.p95} metric={summary.metric} />
      </dl>
      <div className="mt-2 font-mono text-[10px] tabular-nums text-muted-foreground">
        {summary.count} örnek
      </div>
    </article>
  )
}

function PercentileCell({
  label,
  value,
  metric,
  highlight,
}: {
  label: string
  value: number
  metric: VitalMetric
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col">
      <dt
        className={cn(
          'font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground',
          highlight && 'text-foreground/80',
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          'mt-0.5 font-serif tabular-nums',
          highlight ? 'text-foreground' : 'text-foreground/75',
        )}
      >
        {formatVitalValue(metric, value)}
      </dd>
    </div>
  )
}
