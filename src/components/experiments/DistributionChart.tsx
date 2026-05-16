// Wave F26.C — Vanilla SVG bar chart for variant exposures + conversions.
//
// Pair of stacked bars per variant: total exposure (background) + conversion
// (foreground tint). No recharts dependency — the dataset is small (2-4
// variants typically) and the chart needs to render inside a side panel
// without ResponsiveContainer overhead.

import type { Variant } from '@/lib/ab-experiments'

interface DistributionChartProps {
  variants: readonly Variant[]
  className?: string
}

const BAR_HEIGHT = 28
const BAR_GAP = 12
const PADDING_X = 16
const PADDING_TOP = 12
const PADDING_BOTTOM = 8

export function DistributionChart({ variants, className }: DistributionChartProps) {
  if (variants.length === 0) {
    return (
      <div
        data-testid="distribution-chart-empty"
        className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground"
      >
        Bu deneyde henüz varyant yok.
      </div>
    )
  }

  const maxExposure = Math.max(
    ...variants.map((v) => v.exposures ?? 0),
    1, // avoid divide-by-zero when all variants are draft
  )

  const width = 360
  const height =
    PADDING_TOP +
    PADDING_BOTTOM +
    variants.length * BAR_HEIGHT +
    (variants.length - 1) * BAR_GAP

  return (
    <figure
      data-testid="distribution-chart"
      role="img"
      aria-label="Varyant exposure ve conversion dağılımı"
      className={'rounded-xl border border-border bg-card p-4 ' + (className ?? '')}
    >
      <figcaption className="mb-2 flex items-center justify-between gap-2">
        <h4 className="font-serif text-sm tracking-tight">Exposure / Conversion</h4>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-foreground/30" />
            Exposure
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Conversion
          </span>
        </div>
      </figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="presentation"
      >
        {variants.map((v, i) => {
          const exposures = v.exposures ?? 0
          const conversions = v.conversions ?? 0
          const y = PADDING_TOP + i * (BAR_HEIGHT + BAR_GAP)
          const trackWidth = width - PADDING_X * 2
          const expWidth = (exposures / maxExposure) * trackWidth
          const convRatio = exposures > 0 ? conversions / exposures : 0
          const convWidth = expWidth * convRatio
          return (
            <g key={v.id ?? v.key} data-testid={`distribution-bar-${v.key}`}>
              <text
                x={PADDING_X}
                y={y - 2}
                className="fill-muted-foreground font-mono"
                style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {v.name || v.key}
              </text>
              <text
                x={width - PADDING_X}
                y={y - 2}
                textAnchor="end"
                className="fill-muted-foreground font-mono tabular-nums"
                style={{ fontSize: 10 }}
              >
                {exposures.toLocaleString('tr-TR')} · {conversions.toLocaleString('tr-TR')} (%
                {Math.round(convRatio * 100)})
              </text>
              <rect
                x={PADDING_X}
                y={y}
                width={trackWidth}
                height={BAR_HEIGHT}
                rx={6}
                className="fill-foreground/[0.04]"
              />
              <rect
                x={PADDING_X}
                y={y}
                width={Math.max(expWidth, 0)}
                height={BAR_HEIGHT}
                rx={6}
                className="fill-foreground/30"
              />
              <rect
                x={PADDING_X}
                y={y}
                width={Math.max(convWidth, 0)}
                height={BAR_HEIGHT}
                rx={6}
                className="fill-emerald-500"
              />
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

export default DistributionChart
