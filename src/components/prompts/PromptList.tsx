// Wave F12.C — prompts table: name, version count, status, usage, lastUsed.

import { FileCode } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  STATUS_LABEL,
  STATUS_TONE,
  type PromptGroup,
} from '@/lib/platform-prompts'

export interface PromptListProps {
  groups: PromptGroup[]
  selectedId: string | null
  onSelect: (promptId: string) => void
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  const day = Math.floor(diff / 86_400_000)
  if (day < 1) return 'bugün'
  if (day < 30) return `${day}g önce`
  const mo = Math.floor(day / 30)
  return `${mo}ay önce`
}

export default function PromptList({ groups, selectedId, onSelect }: PromptListProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid="prompts-list"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-background/30">
            <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-2.5">Prompt</th>
              <th className="px-3 py-2.5">Aktif sürüm</th>
              <th className="px-3 py-2.5">Durum</th>
              <th className="px-3 py-2.5 text-right">Sürüm sayısı</th>
              <th className="px-3 py-2.5 text-right">Toplam kullanım</th>
              <th className="px-3 py-2.5 text-right">Son kullanım</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {groups.map((g) => (
              <tr
                key={g.promptId}
                onClick={() => onSelect(g.promptId)}
                className={cn(
                  'cursor-pointer transition hover:bg-foreground/[0.02]',
                  g.promptId === selectedId && 'bg-foreground/[0.04]',
                )}
                data-testid="prompts-row"
                data-prompt-id={g.promptId}
              >
                <td className="px-3 py-3 font-mono text-[12.5px]">
                  <span className="inline-flex items-center gap-2">
                    <FileCode className="h-3 w-3 text-muted-foreground" />
                    {g.name}
                  </span>
                </td>
                <td className="px-3 py-3 font-mono text-[12px] tabular-nums text-foreground/85">
                  {g.activeVersion.version}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                      STATUS_TONE[g.activeVersion.status],
                    )}
                  >
                    {STATUS_LABEL[g.activeVersion.status]}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums">
                  {g.versions.length}
                </td>
                <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums">
                  {fmtCount(g.totalUsage)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-[11.5px] tabular-nums text-muted-foreground">
                  {relativeTime(g.lastUsedAtMs)}
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  <FileCode className="mx-auto mb-2 h-5 w-5" />
                  Bu filtrelerle eşleşen prompt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
