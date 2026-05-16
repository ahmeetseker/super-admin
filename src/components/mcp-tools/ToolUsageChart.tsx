// Wave F12.C — vanilla SVG bar chart of tool call counts per day bucket.
// Uses shared `groupByBucket` to slot calls into N evenly-spaced buckets across
// the active time range. Per-bar stacking: success (emerald) / error (rose) /
// timeout (amber). Hover tooltip via <title>.

import { forwardRef, useMemo } from 'react'
import type { McpToolCall } from '@/lib/platform-mcp-tools'
import { groupByBucket, type TimeRange } from '@/lib/super-admin-time-range'

export interface ToolUsageChartProps {
  calls: McpToolCall[]
  range: TimeRange
  bucketCount?: number
}

const W = 720
const H = 220
const PAD_L = 36
const PAD_R = 12
const PAD_T = 16
const PAD_B = 28

const COLOR_SUCCESS = 'rgb(16 185 129)'
const COLOR_ERROR = 'rgb(244 63 94)'
const COLOR_TIMEOUT = 'rgb(245 158 11)'

function fmtBucketLabel(ms: number): string {
  const d = new Date(ms)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

const ToolUsageChart = forwardRef<SVGSVGElement, ToolUsageChartProps>(function ToolUsageChart(
  { calls, range, bucketCount = 30 },
  ref,
) {
  const { buckets, maxCount, totalCount } = useMemo(() => {
    const grouped = groupByBucket(calls, (c) => c.timestampMs, range, bucketCount)
    let maxC = 0
    let total = 0
    const bs = grouped.map((entries, i) => {
      const success = entries.filter((e) => e.status === 'success').length
      const error = entries.filter((e) => e.status === 'error').length
      const timeout = entries.filter((e) => e.status === 'timeout').length
      const count = success + error + timeout
      if (count > maxC) maxC = count
      total += count
      const bucketStartMs = range.startMs + ((range.endMs - range.startMs) / bucketCount) * i
      return { i, success, error, timeout, count, bucketStartMs }
    })
    return { buckets: bs, maxCount: maxC, totalCount: total }
  }, [calls, range, bucketCount])

  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const barGap = 2
  const barW = Math.max(2, innerW / bucketCount - barGap)

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="mcp-tool-usage-chart"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="font-serif text-base font-light">Günlük tool çağrı dağılımı</h3>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          {totalCount} çağrı · {bucketCount} bucket
        </span>
      </header>

      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Günlük tool çağrı dağılımı"
        data-testid="mcp-usage-svg"
      >
        {/* Y-axis grid + labels (3 ticks) */}
        {[0, 0.5, 1].map((p, idx) => {
          const y = PAD_T + innerH * (1 - p)
          const value = Math.round(maxCount * p)
          return (
            <g key={idx}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <text
                x={PAD_L - 6}
                y={y + 3}
                fontSize={9}
                fontFamily="ui-monospace, monospace"
                textAnchor="end"
                fill="currentColor"
                opacity={0.55}
              >
                {value}
              </text>
            </g>
          )
        })}

        {/* Bars (stacked success / error / timeout) */}
        {buckets.map((b) => {
          const x = PAD_L + b.i * (barW + barGap)
          const totalH = maxCount === 0 ? 0 : (b.count / maxCount) * innerH
          const successH = maxCount === 0 ? 0 : (b.success / maxCount) * innerH
          const errorH = maxCount === 0 ? 0 : (b.error / maxCount) * innerH
          const timeoutH = maxCount === 0 ? 0 : (b.timeout / maxCount) * innerH
          const baseY = PAD_T + innerH - totalH
          return (
            <g key={b.i}>
              {/* success segment (bottom) */}
              <rect
                x={x}
                y={PAD_T + innerH - successH}
                width={barW}
                height={successH}
                fill={COLOR_SUCCESS}
                opacity={0.85}
              />
              {/* error segment (middle) */}
              <rect
                x={x}
                y={PAD_T + innerH - successH - errorH}
                width={barW}
                height={errorH}
                fill={COLOR_ERROR}
                opacity={0.85}
              />
              {/* timeout segment (top) */}
              <rect
                x={x}
                y={baseY}
                width={barW}
                height={timeoutH}
                fill={COLOR_TIMEOUT}
                opacity={0.9}
              >
                <title>
                  {fmtBucketLabel(b.bucketStartMs)} · {b.count} çağrı (ok {b.success} / hata {b.error} / timeout {b.timeout})
                </title>
              </rect>
            </g>
          )
        })}

        {/* X-axis labels — show every Nth bucket */}
        {buckets
          .filter((_, i) => i % Math.max(1, Math.floor(bucketCount / 6)) === 0)
          .map((b) => {
            const x = PAD_L + b.i * (barW + barGap) + barW / 2
            return (
              <text
                key={`xl-${b.i}`}
                x={x}
                y={H - 8}
                fontSize={9}
                fontFamily="ui-monospace, monospace"
                textAnchor="middle"
                fill="currentColor"
                opacity={0.55}
              >
                {fmtBucketLabel(b.bucketStartMs)}
              </text>
            )
          })}
      </svg>

      <footer className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted-foreground">
        <LegendDot color={COLOR_SUCCESS} label="Başarılı" />
        <LegendDot color={COLOR_ERROR} label="Hata" />
        <LegendDot color={COLOR_TIMEOUT} label="Zaman aşımı" />
      </footer>
    </section>
  )
})

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

export default ToolUsageChart
