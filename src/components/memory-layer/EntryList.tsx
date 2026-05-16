// Wave F12.D — memory entry list table.
import { Brain } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  TYPE_LABEL,
  SCOPE_LABEL,
  type MemoryEntry,
} from '@/lib/platform-memory'

interface EntryListProps {
  entries: MemoryEntry[]
  onSelect: (entry: MemoryEntry) => void
  selectedId?: string
}

const TYPE_TONE: Record<MemoryEntry['type'], string> = {
  'long-term': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  working: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  episodic: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
}

const SCOPE_DOT: Record<MemoryEntry['scope'], string> = {
  tenant: 'bg-sky-500',
  agent: 'bg-amber-500',
  global: 'bg-foreground/60',
}

function relativeTime(ms: number, now = Date.now()): string {
  const diff = now - ms
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}g önce`
  const mo = Math.floor(day / 30)
  return `${mo}ay önce`
}

export function EntryList({ entries, onSelect, selectedId }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <section
        className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground"
        data-testid="memory-entry-list-empty"
      >
        <Brain className="mx-auto mb-2 h-5 w-5" />
        Bu filtrelerle eşleşen kayıt yok.
      </section>
    )
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid="memory-entry-list"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-background/30">
            <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-2.5">ID · Agent</th>
              <th className="px-3 py-2.5">Tip</th>
              <th className="px-3 py-2.5">Scope</th>
              <th className="px-3 py-2.5">İçerik</th>
              <th className="px-3 py-2.5 text-right">Erişim</th>
              <th className="px-3 py-2.5 text-right">Oluşturuldu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((e) => {
              const isSelected = selectedId === e.id
              return (
                <tr
                  key={e.id}
                  onClick={() => onSelect(e)}
                  className={cn(
                    'cursor-pointer transition hover:bg-foreground/[0.04]',
                    isSelected && 'bg-foreground/[0.05]',
                  )}
                  data-testid={`memory-entry-row-${e.id}`}
                >
                  <td className="px-3 py-3 align-top">
                    <div className="font-mono text-[11px] text-foreground/90">{e.id}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {e.agentId}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                        TYPE_TONE[e.type],
                      )}
                    >
                      {TYPE_LABEL[e.type]}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground/80">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          SCOPE_DOT[e.scope],
                        )}
                      />
                      {SCOPE_LABEL[e.scope]}
                    </span>
                  </td>
                  <td className="max-w-md px-3 py-3 align-top">
                    <p
                      className="line-clamp-2 text-[12.5px] leading-relaxed text-foreground/85"
                      title={e.content}
                    >
                      {e.content}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right align-top font-mono text-[12px] tabular-nums">
                    {e.accessCount}
                  </td>
                  <td className="px-3 py-3 text-right align-top text-[11.5px] text-muted-foreground">
                    {relativeTime(e.createdAt)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
