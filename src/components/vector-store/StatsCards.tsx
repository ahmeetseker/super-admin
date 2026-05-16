// Wave F12.D — vector store KPI stats cards.
import { formatBytes, formatCompact, type VectorStats } from '@/lib/platform-vector'

interface StatsCardsProps {
  stats: VectorStats
  reindexingCount: number
}

export function StatsCards({ stats, reindexingCount }: StatsCardsProps) {
  return (
    <section
      className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
      data-testid="vector-stats-cards"
    >
      <Stat
        testId="vector-stat-vectors"
        label="Toplam vektör"
        value={formatCompact(stats.totalVectors)}
        hint={`${stats.totalVectors.toLocaleString('tr-TR')} satır`}
      />
      <Stat
        testId="vector-stat-collections"
        label="Koleksiyon"
        value={String(stats.totalCollections)}
        hint={
          reindexingCount > 0
            ? `${reindexingCount} yeniden indeksleniyor`
            : 'tümü aktif'
        }
      />
      <Stat
        testId="vector-stat-index-size"
        label="Toplam indeks"
        value={formatBytes(stats.totalIndexSizeBytes)}
        hint="float32 (vektör × boyut × 4)"
      />
      <Stat
        testId="vector-stat-avg-dim"
        label="Ortalama boyut"
        value={`${stats.avgDimension}d`}
        hint="koleksiyon başına"
      />
    </section>
  )
}

function Stat({
  label,
  value,
  hint,
  testId,
}: {
  label: string
  value: string
  hint: string
  testId: string
}) {
  return (
    <article
      className="rounded-2xl border border-border bg-card p-4"
      data-testid={testId}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}
