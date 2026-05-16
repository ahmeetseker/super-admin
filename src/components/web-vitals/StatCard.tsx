// StatCard — token-only stat tile for the /web-vitals dashboard.
// No raw color utilities (no sky/indigo/teal/etc.). Rating chip is
// differentiated by border + foreground-opacity background only.

import { cn } from '@landx/ui'
import type { WebVitalMetricName, WebVitalRating } from '@landx/data'

interface StatCardProps {
  name: WebVitalMetricName
  label: string
  p75: number
  unit: 'ms' | 'score'
  rating: WebVitalRating
  sampleCount: number
  formatValue: (value: number) => string
}

const RATING_LABEL: Record<WebVitalRating, string> = {
  good: 'İyi',
  'needs-improvement': 'Geliştirilmeli',
  poor: 'Zayıf',
}

// Token-only — distinguish via foreground opacity + border weight, not colors.
const RATING_CHIP: Record<WebVitalRating, string> = {
  good: 'border-foreground/40 bg-foreground/[0.08] text-foreground',
  'needs-improvement':
    'border-foreground/25 bg-foreground/[0.05] text-foreground/80',
  poor: 'border-foreground/15 bg-foreground/[0.03] text-foreground/60',
}

export function StatCard({
  name,
  label,
  p75,
  unit,
  rating,
  sampleCount,
  formatValue,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {name} · p75
        </span>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]',
            RATING_CHIP[rating],
          )}
        >
          {RATING_LABEL[rating]}
        </span>
      </div>
      <div className="mt-2 font-serif text-3xl font-light tabular-nums text-foreground">
        {formatValue(p75)}
        {unit === 'ms' && (
          <span className="ml-1 font-mono text-[11px] text-muted-foreground">
            ms
          </span>
        )}
      </div>
      <div className="mt-1 text-[12px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
        {sampleCount} örnek
      </div>
    </article>
  )
}
