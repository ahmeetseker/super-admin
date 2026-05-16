// Wave F20.B — 12-ay MRR + churned-MRR line chart.
//
// Vanilla SVG (currentColor + token-only colour utilities), matching the
// F12 pattern. Two lines on a shared X axis:
//   - MRR (foreground/80)            primary line
//   - Churned MRR (rose tint)        secondary line, normalised against
//                                    the MRR scale so the visual is
//                                    "loss relative to book" rather than
//                                    a separate axis. Tooltip surfaces
//                                    the raw value either way.
//
// The "rose tint" is the only colour utility used — it follows the F12
// llm-cost chart convention where loss/error series use the rose-500/x
// surface tokens.

import type { MonthlyRevenue } from '@/lib/super-admin-tenant-analytics'
import { formatTLCompact } from '@landx/ui'

export interface RevenueTrendChartProps {
  data: readonly MonthlyRevenue[]
}

const W = 720
const H = 200
const PAD_L = 44
const PAD_R = 16
const PAD_T = 16
const PAD_B = 28

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-border bg-card"
        data-testid="revenue-trend-empty"
      >
        <div className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          MRR & churn (12 ay)
        </div>
        <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
          Veri yok.
        </div>
      </div>
    )
  }

  const mrrVals = data.map((d) => d.mrr)
  const churnedVals = data.map((d) => d.churnedMrr)
  const max = Math.max(1, ...mrrVals, ...churnedVals)
  const min = 0
  const range = max - min || 1

  const stepX = data.length > 1 ? (W - PAD_L - PAD_R) / (data.length - 1) : 0

  const points = data.map((d, i) => {
    const x = PAD_L + i * stepX
    const yMrr = PAD_T + (1 - (d.mrr - min) / range) * (H - PAD_T - PAD_B)
    const yChurn = PAD_T + (1 - (d.churnedMrr - min) / range) * (H - PAD_T - PAD_B)
    return { x, yMrr, yChurn, ...d }
  })

  const mrrPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yMrr.toFixed(1)}`)
    .join(' ')
  const lastPt = points[points.length - 1]!
  const firstPt = points[0]!
  const mrrArea = `${mrrPath} L ${lastPt.x.toFixed(1)} ${H - PAD_B} L ${firstPt.x.toFixed(1)} ${H - PAD_B} Z`

  const churnPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yChurn.toFixed(1)}`)
    .join(' ')

  const ticks = [max, max / 2, min]

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid="revenue-trend-chart"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            12 ay
          </div>
          <div className="font-serif text-base">MRR & churn akışı</div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-foreground/80" />
            MRR
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-rose-500/70" />
            Churn
          </span>
        </div>
      </div>
      <div className="p-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`12 aylık MRR ve churned MRR çizgi grafiği`}
          data-testid="revenue-trend-svg"
          className="w-full"
        >
          {ticks.map((t, i) => {
            const y = PAD_T + (1 - (t - min) / range) * (H - PAD_T - PAD_B)
            return (
              <g key={i}>
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-foreground/[0.08]"
                  strokeDasharray="3 3"
                />
                <text
                  x={PAD_L - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-current font-mono text-[9px] tabular-nums text-muted-foreground"
                  fill="currentColor"
                >
                  {formatTLCompact(t).replace('₺', '').trim()}
                </text>
              </g>
            )
          })}

          <path
            d={mrrArea}
            fill="currentColor"
            className="text-foreground/[0.06]"
          />
          <path
            d={mrrPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="text-foreground/80"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={churnPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            className="text-rose-500/80"
            strokeLinejoin="round"
            strokeLinecap="round"
            data-testid="revenue-trend-churn-line"
          />

          {points.map((p) => (
            <g key={p.month}>
              <circle
                cx={p.x}
                cy={p.yMrr}
                r="2.5"
                fill="currentColor"
                className="text-foreground"
              >
                <title>{`${p.month} · MRR ${formatTLCompact(p.mrr)} · churn ${formatTLCompact(p.churnedMrr)}`}</title>
              </circle>
            </g>
          ))}

          {points.map((p, i) => (
            <text
              key={`x-${p.month}`}
              x={p.x}
              y={H - 8}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              className="fill-current font-mono text-[9.5px] tabular-nums text-muted-foreground"
              fill="currentColor"
            >
              {p.month.slice(5)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}

export default RevenueTrendChart
