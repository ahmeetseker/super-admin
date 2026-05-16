// Wave F12.C — mcp-tools detail drawer.
// Shows the most recent 30 calls for a selected tool with status/duration/agentId.

import { useEffect, useMemo } from 'react'
import { X } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  STATUS_LABEL,
  STATUS_TONE,
  formatDurationMs,
  getMcpToolCallsByTool,
} from '@/lib/platform-mcp-tools'

export interface ToolDetailDrawerProps {
  toolName: string
  onClose: () => void
}

function fmtTs(ms: number): string {
  return new Date(ms).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ToolDetailDrawer({ toolName, onClose }: ToolDetailDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const samples = useMemo(() => getMcpToolCallsByTool(toolName, 30), [toolName])
  const successCount = samples.filter((s) => s.status === 'success').length
  const errorCount = samples.filter((s) => s.status === 'error').length
  const timeoutCount = samples.filter((s) => s.status === 'timeout').length

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={`${toolName} çağrı geçmişi`}
      data-testid="mcp-tool-detail-drawer"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Kapat"
        className="flex-1 bg-foreground/40 backdrop-blur-sm"
      />
      <aside className="flex w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              MCP TOOL · SON {samples.length} ÇAĞRI
            </div>
            <h2 className="mt-1 font-serif text-2xl font-light tracking-tight">{toolName}</h2>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">
              {successCount} başarılı · {errorCount} hata · {timeoutCount} timeout
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background/60 p-1.5 text-foreground/70 transition hover:bg-foreground/[0.06]"
            aria-label="Kapat"
            data-testid="mcp-drawer-close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <table className="w-full text-left text-[12px]" data-testid="mcp-drawer-table">
            <thead className="border-b border-border bg-background/30">
              <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-2 py-2">Tarih</th>
                <th className="px-2 py-2">Durum</th>
                <th className="px-2 py-2 text-right">Süre</th>
                <th className="px-2 py-2">Agent</th>
                <th className="px-2 py-2">Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {samples.map((s) => (
                <tr key={s.id} className="hover:bg-foreground/[0.02]">
                  <td className="px-2 py-2 font-mono text-[11px] text-foreground/80">
                    {fmtTs(s.timestampMs)}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                        STATUS_TONE[s.status],
                      )}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums">
                    {formatDurationMs(s.durationMs)}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">{s.agentId}</td>
                  <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground line-clamp-1">
                    {s.errorMessage ?? '—'}
                  </td>
                </tr>
              ))}
              {samples.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-sm text-muted-foreground">
                    Bu tool için çağrı kaydı yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  )
}
