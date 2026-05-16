// KpiCard — single KPI tile for the super-admin overview dashboard.
// Wave F3 / Agent-F3D.
//
// Token-only: positive/negative deltas distinguished by direction arrows
// (ChevronUp/Down) + foreground opacity, never raw colour utilities. The
// mini sparkline uses currentColor so it inherits the surrounding text
// colour and stays theme-neutral.

import type { ComponentType } from 'react'
import { ChevronDown, ChevronUp, Minus } from '@landx/icons'
import { cn } from '@landx/ui'

interface KpiCardProps {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
  delta?: number
  deltaLabel?: string
  /** Series for the inline sparkline (in chronological order, last = now). */
  series?: readonly number[]
  /** ARIA description for the sparkline. */
  sparklineLabel?: string
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  delta,
  deltaLabel,
  series,
  sparklineLabel,
}: KpiCardProps) {
  const direction = typeof delta === 'number' ? Math.sign(delta) : 0
  const ArrowIcon = direction > 0 ? ChevronUp : direction < 0 ? ChevronDown : Minus

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span
          aria-hidden
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/[0.06]"
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {series && series.length > 1 && (
          <KpiSparkline
            data={series}
            ariaLabel={sparklineLabel ?? `${label} eğilimi`}
          />
        )}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px]">
        {typeof delta === 'number' && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
              direction !== 0 ? 'bg-foreground/[0.06] text-foreground' : 'bg-foreground/[0.04] text-muted-foreground',
            )}
            aria-label={
              direction > 0
                ? `Bir önceki döneme göre artış: ${deltaLabel ?? delta}`
                : direction < 0
                  ? `Bir önceki döneme göre azalış: ${deltaLabel ?? delta}`
                  : `Değişim yok`
            }
          >
            <ArrowIcon className="h-3 w-3" aria-hidden />
            {deltaLabel ?? formatDelta(delta)}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </article>
  )
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '' : '±'
  return `${sign}${delta.toFixed(1)}`
}

// Token-only sparkline — uses currentColor so the line takes its tone from
// the surrounding text colour (foreground/80). Area fill is foreground at
// ~6% opacity. Same idea the LLM-cost trend chart uses.
function KpiSparkline({
  data,
  ariaLabel,
}: {
  data: readonly number[]
  ariaLabel: string
}) {
  const W = 64
  const H = 22
  const padX = 1
  const padY = 2
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = data.length > 1 ? (W - padX * 2) / (data.length - 1) : 0
  const points = data.map((v, i) => {
    const x = padX + i * stepX
    const y = padY + (1 - (v - min) / range) * (H - padY * 2)
    return { x, y }
  })
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const areaPath = `${path} L ${points[points.length - 1]!.x.toFixed(1)} ${H - padY} L ${points[0]!.x.toFixed(1)} ${H - padY} Z`
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={ariaLabel}
      data-testid="kpi-sparkline"
      className="flex-none text-foreground/70"
    >
      <path d={areaPath} fill="currentColor" className="text-foreground/[0.08]" />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
