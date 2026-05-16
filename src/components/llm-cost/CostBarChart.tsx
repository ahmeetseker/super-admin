// Wave F12.A — LLM cost bar chart. Vanilla SVG, day-bucketed.
import { forwardRef, useMemo } from 'react'
import { groupByBucket, type TimeRange } from '@/lib/super-admin-time-range'
import type { LlmCostEntry } from '@/lib/platform-llm-cost'

const TL_FMT = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})

export interface CostBarChartProps {
  entries: readonly LlmCostEntry[]
  range: TimeRange
  bucketCount?: number
}

const W = 720
const H = 220
const PAD_X = 32
const PAD_TOP = 16
const PAD_BOTTOM = 32

const CostBarChart = forwardRef<SVGSVGElement, CostBarChartProps>(function CostBarChart(
  { entries, range, bucketCount },
  ref,
) {
  const bucketN = bucketCount ?? defaultBuckets(range)

  const { bars, max, totalCost } = useMemo(() => {
    const groups = groupByBucket([...entries], (e) => e.timestamp, range, bucketN)
    const sums = groups.map((g) => g.reduce((s, e) => s + e.costTL, 0))
    const max = sums.reduce((m, v) => Math.max(m, v), 0) || 1
    const totalCost = sums.reduce((s, v) => s + v, 0)
    return { bars: sums, max, totalCost }
  }, [entries, range, bucketN])

  const innerW = W - PAD_X * 2
  const innerH = H - PAD_TOP - PAD_BOTTOM
  const barGap = 2
  const barW = Math.max(2, innerW / bars.length - barGap)

  const formatBucketLabel = (idx: number): string => {
    const span = range.endMs - range.startMs
    const ms = range.startMs + (span * (idx + 0.5)) / bars.length
    const d = new Date(ms)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const isEmpty = totalCost === 0

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card" data-testid="llm-cost-bar-chart">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Günlük dağılım
            </div>
            <div className="font-serif text-base">LLM harcaması</div>
          </div>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {bars.length} kova · {TL_FMT.format(totalCost)}
          </span>
        </div>
      </div>
      <div className="p-3">
        {isEmpty ? (
          <div className="flex h-[180px] items-center justify-center text-[12px] text-muted-foreground" data-testid="llm-cost-bar-chart-empty">
            Seçili aralık için veri yok.
          </div>
        ) : (
          <svg
            ref={ref}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label="LLM günlük maliyet bar chart"
            data-testid="llm-cost-bar-chart-svg"
          >
            <rect x={0} y={0} width={W} height={H} fill="white" />
            {/* Gridlines */}
            {[0.25, 0.5, 0.75, 1].map((g) => {
              const y = PAD_TOP + innerH * (1 - g)
              return (
                <g key={g}>
                  <line
                    x1={PAD_X}
                    x2={W - PAD_X}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-foreground/10"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD_X - 4}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-current text-foreground/50"
                    style={{ fontSize: 9 }}
                  >
                    {TL_FMT.format(max * g)}
                  </text>
                </g>
              )
            })}
            {/* Bars */}
            {bars.map((value, i) => {
              const ratio = value / max
              const h = innerH * ratio
              const x = PAD_X + i * (barW + barGap)
              const y = PAD_TOP + innerH - h
              return (
                <g key={i} data-testid={`llm-bar-${i}`}>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(h, value > 0 ? 1 : 0)}
                    rx={1.5}
                    fill="currentColor"
                    className="text-foreground/80"
                  >
                    <title>{`${formatBucketLabel(i)} · ${TL_FMT.format(value)}`}</title>
                  </rect>
                </g>
              )
            })}
            {/* X labels (every Nth) */}
            {bars.map((_, i) => {
              const everyN = Math.max(1, Math.ceil(bars.length / 8))
              if (i % everyN !== 0) return null
              const x = PAD_X + i * (barW + barGap) + barW / 2
              return (
                <text
                  key={`xl-${i}`}
                  x={x}
                  y={H - PAD_BOTTOM + 14}
                  textAnchor="middle"
                  className="fill-current text-foreground/60"
                  style={{ fontSize: 9 }}
                >
                  {formatBucketLabel(i)}
                </text>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
})

function defaultBuckets(range: TimeRange): number {
  const span = range.endMs - range.startMs
  const day = 24 * 60 * 60 * 1000
  if (span <= day) return 24
  if (span <= 7 * day) return 7
  if (span <= 30 * day) return 30
  return 30
}

export default CostBarChart
