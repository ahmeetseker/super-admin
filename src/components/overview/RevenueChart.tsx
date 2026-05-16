// RevenueChart — 12-month platform revenue line chart for the super-admin
// overview dashboard. Wave F3 / Agent-F3D.
//
// Inline SVG (currentColor) instead of pulling Recharts into the main
// chunk — the F3D budget watch is tight (58.46/65 KB). The llm-cost route
// uses the same pattern and stays well under budget. Tokens only.

import { cn, formatTLCompact } from '@landx/ui'
import type { MonthlyRevenuePoint } from '@landx/data'

interface RevenueChartProps {
  data: readonly MonthlyRevenuePoint[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Aylık ciro
        </div>
        <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
          Henüz veri yok.
        </div>
      </div>
    )
  }

  const W = 720
  const H = 160
  const padL = 36
  const padR = 12
  const padT = 12
  const padB = 24
  const min = Math.min(...data.map((d) => d.revenue))
  const max = Math.max(...data.map((d) => d.revenue))
  const range = max - min || 1
  const stepX = data.length > 1 ? (W - padL - padR) / (data.length - 1) : 0

  const points = data.map((d, i) => {
    const x = padL + i * stepX
    const y = padT + (1 - (d.revenue - min) / range) * (H - padT - padB)
    return { x, y, ...d }
  })
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const areaPath = `${path} L ${points[points.length - 1]!.x.toFixed(1)} ${H - padB} L ${points[0]!.x.toFixed(1)} ${H - padB} Z`

  const last = data[data.length - 1]!
  const prev = data[data.length - 2]
  const deltaPct = prev ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : 0
  const total12m = data.reduce((s, d) => s + d.revenue, 0)

  // Y-axis ticks — 3 reference lines (max / mid / min).
  const ticks = [max, (max + min) / 2, min]

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            12-ay trend
          </div>
          <div className="font-serif text-base">Aylık platform cirosu</div>
        </div>
        <div className="flex items-baseline gap-3">
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Toplam (12a)
            </div>
            <div className="font-serif text-[15px] tabular-nums">{formatTLCompact(total12m)}</div>
          </div>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-mono text-[10px] tabular-nums',
              'bg-foreground/[0.06] text-foreground',
            )}
            aria-label={`Bir önceki aya göre yüzde değişim: ${deltaPct.toFixed(1)}`}
          >
            {deltaPct >= 0 ? '+' : ''}
            {deltaPct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="px-4 py-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Son 12 ay aylık ciro grafiği: ${data.map((d) => `${d.label} ${formatTLCompact(d.revenue)}`).join(', ')}`}
          data-testid="revenue-chart-svg"
          className="w-full"
        >
          {/* Reference grid lines */}
          {ticks.map((t, i) => {
            const y = padT + (1 - (t - min) / range) * (H - padT - padB)
            return (
              <g key={i}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-foreground/[0.08]"
                  strokeDasharray="3 3"
                />
                <text
                  x={padL - 6}
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
          <path d={areaPath} fill="currentColor" className="text-foreground/[0.06]" />
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="text-foreground/80"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p) => (
            <circle
              key={p.month}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill="currentColor"
              className="text-foreground"
            >
              <title>{`${p.label} · ${formatTLCompact(p.revenue)}`}</title>
            </circle>
          ))}
          {/* X-axis labels */}
          {points.map((p, i) => (
            <text
              key={p.month}
              x={p.x}
              y={H - 6}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              className="fill-current font-mono text-[9.5px] tabular-nums text-muted-foreground"
              fill="currentColor"
            >
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
