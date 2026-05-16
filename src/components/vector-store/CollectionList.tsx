// Wave F12.D — vector collection list table with reindex action.
import { Database } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  STATUS_LABEL,
  METRIC_LABEL,
  formatBytes,
  formatCompact,
  type VectorCollection,
} from '@/lib/platform-vector'
import { ReindexButton } from './ReindexButton'

interface CollectionListProps {
  collections: VectorCollection[]
}

const STATUS_TONE: Record<VectorCollection['status'], string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  reindexing: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  stale: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

const STATUS_DOT: Record<VectorCollection['status'], string> = {
  active: 'bg-emerald-500',
  reindexing: 'bg-sky-500 animate-pulse',
  stale: 'bg-amber-500',
}

function relativeTime(ms: number, now = Date.now()): string {
  const diff = now - ms
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

export function CollectionList({ collections }: CollectionListProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid="vector-collection-list"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-background/30">
            <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-2.5">Koleksiyon</th>
              <th className="px-3 py-2.5">Durum</th>
              <th className="px-3 py-2.5 text-right">Vektör</th>
              <th className="px-3 py-2.5 text-right">Boyut</th>
              <th className="px-3 py-2.5">Metrik</th>
              <th className="px-3 py-2.5 text-right">İndeks</th>
              <th className="px-3 py-2.5 text-right">Son indeks</th>
              <th className="px-3 py-2.5 text-right">Eylem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {collections.map((c) => (
              <tr
                key={c.id}
                className="transition hover:bg-foreground/[0.02]"
                data-testid={`vector-row-${c.id}`}
              >
                <td className="px-3 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-foreground/70" />
                    <span className="font-mono text-[12px] text-foreground/90">
                      {c.name}
                    </span>
                  </div>
                  <div className="mt-0.5 max-w-xs truncate text-[11px] text-muted-foreground">
                    {c.description}
                  </div>
                </td>
                <td className="px-3 py-3 align-top">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                      STATUS_TONE[c.status],
                    )}
                    data-testid={`vector-status-${c.id}`}
                  >
                    <span
                      className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[c.status])}
                    />
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="px-3 py-3 text-right align-top font-mono text-[12px] tabular-nums">
                  {formatCompact(c.vectorCount)}
                </td>
                <td className="px-3 py-3 text-right align-top font-mono text-[12px] tabular-nums">
                  {c.dimension}d
                </td>
                <td className="px-3 py-3 align-top text-[12px] text-foreground/80">
                  {METRIC_LABEL[c.distanceMetric]}
                </td>
                <td className="px-3 py-3 text-right align-top font-mono text-[11.5px] tabular-nums">
                  {formatBytes(c.indexSize)}
                </td>
                <td className="px-3 py-3 text-right align-top text-[11.5px] text-muted-foreground">
                  {relativeTime(c.lastReindexedAt)}
                </td>
                <td className="px-3 py-3 text-right align-top">
                  <ReindexButton collection={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
