// Wave F12.D — memory layer KPI stats cards.
import type { MemoryStats } from '@/lib/platform-memory'

interface StatsCardsProps {
  stats: MemoryStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const hitRatePct = (stats.hitRate * 100).toFixed(1)
  const longTermPct = stats.totalEntries === 0
    ? '0'
    : ((stats.byType['long-term'] / stats.totalEntries) * 100).toFixed(0)

  return (
    <section
      className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
      data-testid="memory-stats-cards"
    >
      <Stat
        testId="stat-total"
        label="Toplam kayıt"
        value={stats.totalEntries.toLocaleString('tr-TR')}
        hint={`${stats.byScope.tenant} tenant · ${stats.byScope.agent} agent · ${stats.byScope.global} global`}
      />
      <Stat
        testId="stat-long-term"
        label="Uzun süreli"
        value={stats.byType['long-term'].toLocaleString('tr-TR')}
        hint={`%${longTermPct} oran · ${stats.byType['working']} çalışma · ${stats.byType['episodic']} episodik`}
      />
      <Stat
        testId="stat-avg-access"
        label="Ortalama erişim"
        value={stats.avgAccessCount.toFixed(1)}
        hint={`${stats.totalHits.toLocaleString('tr-TR')} toplam hit`}
      />
      <Stat
        testId="stat-hit-rate"
        label="Hit rate"
        value={`%${hitRatePct}`}
        hint="mock — totalHits / (entries × 10)"
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
