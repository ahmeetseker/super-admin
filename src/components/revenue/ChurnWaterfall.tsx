// Wave F20.B — MRR movement waterfall.
//
// Vanilla SVG bar chart. Six most recent months, each rendered as a
// triplet of bars:
//   - new MRR        emerald tint   (positive)
//   - expansion MRR  blue tint      (positive)
//   - churned MRR    rose tint      (drawn downward / negative)
//
// "Waterfall" here is the colloquial product sense — month-over-month
// MRR movement components — not the strict finance running-total
// waterfall, which doesn't carry useful signal at this read.

import type { MonthlyRevenue } from '@/lib/super-admin-tenant-analytics'
import { formatTLCompact } from '@landx/ui'

export interface ChurnWaterfallProps {
  history: readonly MonthlyRevenue[]
  months?: number
}

const W = 720
const H = 240
const PAD_L = 44
const PAD_R = 16
const PAD_T = 16
const PAD_B = 36

export function ChurnWaterfall({ history, months = 6 }: ChurnWaterfallProps) {
  const rows = history.slice(-months)

  if (rows.length === 0) {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-border bg-card"
        data-testid="revenue-waterfall-empty"
      >
        <div className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          MRR hareketi
        </div>
        <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
          Veri yok.
        </div>
      </div>
    )
  }

  const positiveMax = Math.max(
    1,
    ...rows.map((r) => Math.max(r.newMrr, r.expansionMrr)),
  )
  const negativeMax = Math.max(1, ...rows.map((r) => r.churnedMrr))
  const yMax = Math.max(positiveMax, negativeMax)

  const innerH = H - PAD_T - PAD_B
  const zeroY = PAD_T + innerH / 2
  const halfH = innerH / 2

  const groupW = (W - PAD_L - PAD_R) / rows.length
  const barGap = 4
  const barW = Math.max(4, (groupW - barGap * 4) / 3)

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid="revenue-waterfall"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Son {rows.length} ay
          </div>
          <div className="font-serif text-base">MRR hareketi · yeni / büyüme / churn</div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-sm bg-emerald-500/80" />
            Yeni
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-sm bg-sky-500/80" />
            Büyüme
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-sm bg-rose-500/80" />
            Churn
          </span>
        </div>
      </div>
      <div className="p-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Son ${rows.length} ay MRR hareketi: yeni, büyüme, churn`}
          data-testid="revenue-waterfall-svg"
          className="w-full"
        >
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={zeroY}
            y2={zeroY}
            stroke="currentColor"
            className="text-foreground/30"
          />

          <text
            x={PAD_L - 6}
            y={PAD_T + 8}
            textAnchor="end"
            className="fill-current font-mono text-[9px] tabular-nums text-muted-foreground"
            fill="currentColor"
          >
            {formatTLCompact(yMax).replace('₺', '').trim()}
          </text>
          <text
            x={PAD_L - 6}
            y={zeroY + 3}
            textAnchor="end"
            className="fill-current font-mono text-[9px] tabular-nums text-muted-foreground"
            fill="currentColor"
          >
            0
          </text>
          <text
            x={PAD_L - 6}
            y={H - PAD_B + 3}
            textAnchor="end"
            className="fill-current font-mono text-[9px] tabular-nums text-muted-foreground"
            fill="currentColor"
          >
            -{formatTLCompact(yMax).replace('₺', '').trim()}
          </text>

          {rows.map((r, i) => {
            const groupX = PAD_L + i * groupW + barGap
            const newH = (r.newMrr / yMax) * halfH
            const expH = (r.expansionMrr / yMax) * halfH
            const churnH = (r.churnedMrr / yMax) * halfH

            const newX = groupX
            const expX = groupX + barW + barGap
            const churnX = groupX + (barW + barGap) * 2

            return (
              <g key={r.month} data-testid={`waterfall-month-${r.month}`}>
                <rect
                  x={newX}
                  y={zeroY - newH}
                  width={barW}
                  height={newH}
                  className="fill-emerald-500/80"
                >
                  <title>{`${r.month} · Yeni MRR ${formatTLCompact(r.newMrr)}`}</title>
                </rect>
                <rect
                  x={expX}
                  y={zeroY - expH}
                  width={barW}
                  height={expH}
                  className="fill-sky-500/80"
                >
                  <title>{`${r.month} · Büyüme ${formatTLCompact(r.expansionMrr)}`}</title>
                </rect>
                <rect
                  x={churnX}
                  y={zeroY}
                  width={barW}
                  height={churnH}
                  className="fill-rose-500/80"
                >
                  <title>{`${r.month} · Churn ${formatTLCompact(r.churnedMrr)}`}</title>
                </rect>
                <text
                  x={groupX + (barW * 3 + barGap * 2) / 2}
                  y={H - PAD_B + 18}
                  textAnchor="middle"
                  className="fill-current font-mono text-[9.5px] tabular-nums text-muted-foreground"
                  fill="currentColor"
                >
                  {r.month.slice(5)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default ChurnWaterfall
