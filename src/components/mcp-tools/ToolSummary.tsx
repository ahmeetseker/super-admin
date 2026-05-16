// Wave F12.C — mcp-tools per-tool summary table.
// Sortable: callCount / successRate / avgDuration. Default = callCount desc.

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Wrench } from '@landx/icons'
import { cn } from '@landx/ui'
import { formatDurationMs, type McpToolSummary } from '@/lib/platform-mcp-tools'

type SortKey = 'callCount' | 'successRate' | 'avgDurationMs' | 'p95DurationMs'

export interface ToolSummaryProps {
  rows: McpToolSummary[]
  onSelectTool: (toolName: string) => void
}

function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

function rateTone(rate: number): string {
  if (rate >= 0.95) return 'text-emerald-700 dark:text-emerald-300'
  if (rate >= 0.85) return 'text-amber-700 dark:text-amber-300'
  return 'text-rose-700 dark:text-rose-300'
}

export default function ToolSummary({ rows, onSelectTool }: ToolSummaryProps) {
  const [sortKey, setSortKey] = useState<SortKey>('callCount')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    const list = [...rows]
    list.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [rows, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function Arrow({ k }: { k: SortKey }) {
    if (k !== sortKey) return null
    return sortDir === 'asc' ? <ArrowUp className="ml-0.5 inline h-3 w-3" /> : <ArrowDown className="ml-0.5 inline h-3 w-3" />
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid="mcp-tool-summary"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-background/30">
            <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-2.5">Tool</th>
              <th
                className="cursor-pointer px-3 py-2.5 text-right select-none"
                onClick={() => toggleSort('callCount')}
              >
                Çağrı <Arrow k="callCount" />
              </th>
              <th
                className="cursor-pointer px-3 py-2.5 text-right select-none"
                onClick={() => toggleSort('successRate')}
              >
                Başarı <Arrow k="successRate" />
              </th>
              <th
                className="cursor-pointer px-3 py-2.5 text-right select-none"
                onClick={() => toggleSort('avgDurationMs')}
              >
                Ort. süre <Arrow k="avgDurationMs" />
              </th>
              <th
                className="cursor-pointer px-3 py-2.5 text-right select-none"
                onClick={() => toggleSort('p95DurationMs')}
              >
                p95 <Arrow k="p95DurationMs" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((row) => (
              <tr
                key={row.toolName}
                onClick={() => onSelectTool(row.toolName)}
                className="cursor-pointer transition hover:bg-foreground/[0.02]"
                data-testid="mcp-tool-row"
                data-tool={row.toolName}
              >
                <td className="px-3 py-3 font-mono text-[12.5px]">
                  <span className="inline-flex items-center gap-2">
                    <Wrench className="h-3 w-3 text-muted-foreground" />
                    {row.toolName}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums">
                  {row.callCount}
                </td>
                <td className={cn('px-3 py-3 text-right font-mono text-[12px] tabular-nums', rateTone(row.successRate))}>
                  {fmtPct(row.successRate)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums text-foreground/80">
                  {formatDurationMs(row.avgDurationMs)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                  {formatDurationMs(row.p95DurationMs)}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Bu filtrelerle eşleşen tool çağrısı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
