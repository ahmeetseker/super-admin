// Wave F12.B — VitalsChart: vanilla SVG multi-line chart.
//
// One chart per selected metric, three lines (p50/p75/p95) drawn over the
// shared time-range buckets. No external charting lib — keeps the route
// inside the super-admin bundle budget.

import { useMemo, useRef } from 'react'
import { Download } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  bucketSeries,
  THRESHOLDS,
  type VitalEntry,
  type VitalMetric,
} from '@/lib/platform-web-vitals'
import { formatVitalValue } from '@/components/web-vitals/MetricCards'
import {
  downloadSvgAsPng,
  todayStamp,
} from '@/lib/super-admin-chart-export'

export interface VitalsChartProps {
  entries: VitalEntry[]
  metric: VitalMetric
  buckets: number[]
}

const W = 720
const H = 220
const PADDING = { top: 16, right: 24, bottom: 28, left: 48 }

type LineKey = 'p50' | 'p75' | 'p95'

const LINE_LABEL: Record<LineKey, string> = {
  p50: 'p50',
  p75: 'p75',
  p95: 'p95',
}

// Token-only line tones: opacity ladder so the three series remain
// distinguishable in both light and dark themes.
const LINE_TONE: Record<LineKey, { stroke: string; strokeWidth: number }> = {
  p50: { stroke: 'currentColor', strokeWidth: 1 },
  p75: { stroke: 'currentColor', strokeWidth: 1.5 },
  p95: { stroke: 'currentColor', strokeWidth: 1 },
}

const LINE_OPACITY: Record<LineKey, number> = {
  p50: 0.4,
  p75: 1,
  p95: 0.65,
}

const LINE_DASH: Record<LineKey, string | undefined> = {
  p50: '4 3',
  p75: undefined,
  p95: '2 3',
}

const DAY_FMT = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
})

export function VitalsChart({ entries, metric, buckets }: VitalsChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const series = useMemo(() => bucketSeries(entries, metric, buckets), [entries, metric, buckets])

  const innerW = W - PADDING.left - PADDING.right
  const innerH = H - PADDING.top - PADDING.bottom

  const allValues: number[] = []
  for (const pt of series.points) {
    if (pt.count === 0) continue
    allValues.push(pt.p50, pt.p75, pt.p95)
  }
  const threshold = THRESHOLDS[metric]
  const maxRaw = allValues.length > 0 ? Math.max(...allValues) : threshold.amberMax
  const yMax = Math.max(maxRaw, threshold.amberMax) * 1.1
  const yMin = 0
  const range = yMax - yMin || 1

  function x(idx: number): number {
    if (series.points.length <= 1) return PADDING.left + innerW / 2
    return PADDING.left + (idx / (series.points.length - 1)) * innerW
  }
  function y(value: number): number {
    return PADDING.top + (1 - (value - yMin) / range) * innerH
  }

  function pathFor(key: LineKey): string {
    const cmds: string[] = []
    let started = false
    series.points.forEach((pt, i) => {
      if (pt.count === 0) {
        started = false
        return
      }
      const cmd = started ? 'L' : 'M'
      cmds.push(`${cmd} ${x(i).toFixed(1)} ${y(pt[key]).toFixed(1)}`)
      started = true
    })
    return cmds.join(' ')
  }

  // Y-axis ticks at 0 / amberMax / greenMax for threshold context.
  const yTicks = [0, threshold.greenMax, threshold.amberMax].filter((v) => v <= yMax)

  // X-axis ticks: ~6 evenly spaced labels.
  const xTickCount = Math.min(6, series.points.length)
  const xTicks: { i: number; label: string }[] = []
  if (series.points.length > 0) {
    for (let i = 0; i < xTickCount; i++) {
      const idx = Math.round(((series.points.length - 1) * i) / Math.max(1, xTickCount - 1))
      xTicks.push({ i: idx, label: DAY_FMT.format(series.points[idx].bucketStart) })
    }
  }

  const sampleTotal = series.points.reduce((acc, p) => acc + p.count, 0)

  async function handleExport() {
    if (!svgRef.current) return
    await downloadSvgAsPng(svgRef.current, `web-vitals-${metric}-${todayStamp()}.png`)
  }

  return (
    <article
      className="rounded-2xl border border-border bg-card p-4"
      data-testid={`vitals-chart-${metric}`}
    >
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {metric} · zaman serisi
          </div>
          <div className="font-serif text-base">p50 / p75 / p95</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {sampleTotal} örnek
          </span>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition hover:bg-foreground/[0.04]"
            data-testid={`vitals-chart-export-${metric}`}
          >
            <Download className="h-3 w-3" aria-hidden />
            PNG
          </button>
        </div>
      </header>

      <Legend />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${metric} p50/p75/p95 zaman serisi`}
        className="mt-2 w-full text-foreground"
      >
        {/* Plot background */}
        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={innerW}
          height={innerH}
          fill="currentColor"
          className="text-foreground/[0.02]"
        />

        {/* Y gridlines + threshold markers */}
        {yTicks.map((tick) => {
          const yy = y(tick)
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={PADDING.left + innerW}
                y1={yy}
                y2={yy}
                stroke="currentColor"
                className="text-foreground/10"
                strokeDasharray={tick === threshold.greenMax || tick === threshold.amberMax ? '3 3' : undefined}
              />
              <text
                x={PADDING.left - 6}
                y={yy + 3}
                textAnchor="end"
                className="fill-current font-mono text-[9px] text-muted-foreground"
              >
                {tick === 0 ? '0' : formatVitalValue(metric, tick)}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {xTicks.map((tick) => (
          <text
            key={tick.i}
            x={x(tick.i)}
            y={H - PADDING.bottom + 16}
            textAnchor="middle"
            className="fill-current font-mono text-[9px] text-muted-foreground"
          >
            {tick.label}
          </text>
        ))}

        {/* Lines: p50, p95, p75 (p75 drawn last → on top) */}
        {(['p50', 'p95', 'p75'] as LineKey[]).map((key) => {
          const tone = LINE_TONE[key]
          const d = pathFor(key)
          if (!d) return null
          return (
            <path
              key={key}
              d={d}
              fill="none"
              stroke={tone.stroke}
              strokeWidth={tone.strokeWidth}
              strokeOpacity={LINE_OPACITY[key]}
              strokeDasharray={LINE_DASH[key]}
              strokeLinejoin="round"
              strokeLinecap="round"
              data-testid={`vitals-line-${metric}-${key}`}
            />
          )
        })}

        {/* Points on p75 for emphasis */}
        {series.points.map((pt, i) =>
          pt.count > 0 ? (
            <circle
              key={i}
              cx={x(i)}
              cy={y(pt.p75)}
              r={2}
              fill="currentColor"
              className="text-foreground"
            />
          ) : null,
        )}
      </svg>
    </article>
  )
}

function Legend() {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
      {(['p50', 'p75', 'p95'] as LineKey[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <svg width="20" height="6" aria-hidden>
            <line
              x1="0"
              x2="20"
              y1="3"
              y2="3"
              stroke="currentColor"
              strokeWidth={LINE_TONE[k].strokeWidth}
              strokeOpacity={LINE_OPACITY[k]}
              strokeDasharray={LINE_DASH[k]}
              className={cn('text-foreground')}
            />
          </svg>
          {LINE_LABEL[k]}
        </span>
      ))}
    </div>
  )
}
