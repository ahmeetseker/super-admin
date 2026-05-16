// Wave F12.D — vanilla SVG horizontal bar chart for vector distribution.
// x = vectorCount (proportional), y = collection name.
import { formatCompact, type VectorCollection } from '@/lib/platform-vector'

interface DistributionChartProps {
  collections: VectorCollection[]
}

const WIDTH = 640
const ROW_HEIGHT = 32
const TOP_PAD = 16
const BOTTOM_PAD = 8
const LEFT_PAD = 140 // for labels
const RIGHT_PAD = 70 // for value text

export function DistributionChart({ collections }: DistributionChartProps) {
  if (collections.length === 0) {
    return (
      <section
        className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground"
        data-testid="vector-distribution-chart-empty"
      >
        Veri yok.
      </section>
    )
  }

  const max = Math.max(...collections.map((c) => c.vectorCount))
  const barAreaWidth = WIDTH - LEFT_PAD - RIGHT_PAD
  const height = TOP_PAD + collections.length * ROW_HEIGHT + BOTTOM_PAD

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      data-testid="vector-distribution-chart"
    >
      <h2 className="mb-3 font-serif text-base font-light tracking-tight">
        Koleksiyon dağılımı
      </h2>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          width="100%"
          role="img"
          aria-label="Koleksiyon başına vektör sayısı dağılımı"
          className="block"
        >
          {collections.map((c, i) => {
            const y = TOP_PAD + i * ROW_HEIGHT
            // proportional with a min-width so even smallest is visible
            const rawWidth = (c.vectorCount / max) * barAreaWidth
            const barWidth = Math.max(2, rawWidth)
            const barHeight = ROW_HEIGHT - 12
            return (
              <g
                key={c.id}
                data-testid={`vector-bar-${c.id}`}
              >
                <text
                  x={LEFT_PAD - 8}
                  y={y + barHeight / 2 + 4}
                  textAnchor="end"
                  className="fill-foreground/80"
                  style={{
                    fontSize: 11,
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  }}
                >
                  {c.name}
                </text>
                <rect
                  x={LEFT_PAD}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={3}
                  className="fill-foreground/[0.18]"
                />
                <rect
                  x={LEFT_PAD}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={3}
                  fill="none"
                  className="stroke-foreground/30"
                  strokeWidth={1}
                />
                <text
                  x={LEFT_PAD + barWidth + 6}
                  y={y + barHeight / 2 + 4}
                  className="fill-foreground/70"
                  style={{
                    fontSize: 10.5,
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  }}
                >
                  {formatCompact(c.vectorCount)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
