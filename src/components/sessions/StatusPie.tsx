// Wave F12.A — Session status pie chart. Vanilla SVG, 3 segments.
import { forwardRef } from 'react'
import { STATUS_LABEL, type StatusSlice } from '@/lib/platform-sessions'

const W = 320
const H = 220
const CX = 110
const CY = H / 2
const RADIUS = 80

const STATUS_COLOR: Record<StatusSlice['status'], string> = {
  active: '#0ea5e9', // sky-500
  expired: '#a3a3a3', // neutral-400
  revoked: '#f43f5e', // rose-500
}

export interface StatusPieProps {
  slices: readonly StatusSlice[]
}

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number): { x: number; y: number } {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
}

function arcPath(cx: number, cy: number, r: number, startRad: number, endRad: number): string {
  // Avoid full-circle ambiguity by drawing two halves
  if (endRad - startRad >= Math.PI * 2 - 1e-6) {
    const mid = startRad + Math.PI
    return [arcPath(cx, cy, r, startRad, mid), arcPath(cx, cy, r, mid, startRad + Math.PI * 2)].join(' ')
  }
  const start = polarToCartesian(cx, cy, r, startRad)
  const end = polarToCartesian(cx, cy, r, endRad)
  const largeArc = endRad - startRad > Math.PI ? 1 : 0
  return [
    `M ${cx} ${cy}`,
    `L ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

const StatusPie = forwardRef<SVGSVGElement, StatusPieProps>(function StatusPie({ slices }, ref) {
  const total = slices.reduce((s, x) => s + x.count, 0)
  const isEmpty = total === 0

  let angle = -Math.PI / 2 // start at 12 o'clock

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card" data-testid="sessions-status-pie">
      <div className="border-b border-border px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Durum dağılımı
        </div>
        <div className="font-serif text-base">Oturum statüleri</div>
      </div>
      <div className="p-3">
        {isEmpty ? (
          <div className="flex h-[180px] items-center justify-center text-[12px] text-muted-foreground" data-testid="sessions-status-pie-empty">
            Seçili aralık için veri yok.
          </div>
        ) : (
          <svg
            ref={ref}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label="Oturum statü dağılım grafiği"
            data-testid="sessions-status-pie-svg"
          >
            <rect x={0} y={0} width={W} height={H} fill="white" />
            {slices.map((slice) => {
              if (slice.count === 0) return null
              const sliceAngle = (slice.count / total) * Math.PI * 2
              const start = angle
              const end = angle + sliceAngle
              angle = end
              const path = arcPath(CX, CY, RADIUS, start, end)
              return (
                <path
                  key={slice.status}
                  d={path}
                  fill={STATUS_COLOR[slice.status]}
                  stroke="white"
                  strokeWidth={1}
                  data-testid={`sessions-pie-slice-${slice.status}`}
                >
                  <title>{`${STATUS_LABEL[slice.status]} · ${slice.count} (${Math.round(slice.share * 100)}%)`}</title>
                </path>
              )
            })}

            {/* Legend (right side) */}
            {slices.map((slice, idx) => {
              const y = 40 + idx * 26
              return (
                <g key={slice.status} data-testid={`sessions-pie-legend-${slice.status}`}>
                  <rect x={220} y={y - 8} width={12} height={12} rx={2} fill={STATUS_COLOR[slice.status]} />
                  <text
                    x={238}
                    y={y + 2}
                    className="fill-current text-foreground"
                    style={{ fontSize: 11, fontFamily: 'sans-serif' }}
                  >
                    {STATUS_LABEL[slice.status]}
                  </text>
                  <text
                    x={238}
                    y={y + 14}
                    className="fill-current text-foreground/60"
                    style={{ fontSize: 10, fontFamily: 'monospace' }}
                  >
                    {slice.count} · {Math.round(slice.share * 100)}%
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
})

export default StatusPie
