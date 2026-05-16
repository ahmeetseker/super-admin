// Webhook delivery history table — son 30 attempt per endpoint.
// Status badges: 2xx green / 4xx amber / 5xx red. Retry button stub.

import { useMemo, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Inbox } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  getDeliveries,
  statusCodeTone,
  type WebhookDelivery,
} from '@/lib/platform-webhooks'

interface Props {
  endpointId: string
  className?: string
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms
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

const TONE_STYLES = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  error: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  neutral: 'bg-stone-500/10 text-stone-700 dark:text-stone-300',
} as const

export function DeliveryHistoryView({ endpointId, className }: Props) {
  // Read once per mount — store is deterministic per endpoint.
  const deliveries = useMemo<WebhookDelivery[]>(() => getDeliveries(endpointId), [endpointId])
  const [retrying, setRetrying] = useState<Set<string>>(new Set())
  const [retried, setRetried] = useState<Set<string>>(new Set())

  const handleRetry = (id: string) => {
    setRetrying((s) => new Set(s).add(id))
    window.setTimeout(() => {
      setRetrying((s) => {
        const next = new Set(s)
        next.delete(id)
        return next
      })
      setRetried((s) => new Set(s).add(id))
    }, 600)
  }

  if (deliveries.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center',
          className,
        )}
      >
        <Inbox className="h-6 w-6 text-muted-foreground" />
        <p className="text-[13px] font-medium">Henüz teslimat yok</p>
        <p className="text-[11.5px] text-muted-foreground">
          İlk olay gönderildiğinde burada görünecek.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card',
        className,
      )}
      data-testid="delivery-history-view"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Son teslimatlar
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          son {deliveries.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead className="border-b border-border bg-background/30">
            <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-2">Zaman</th>
              <th className="px-3 py-2">Olay</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2 text-right">Süre</th>
              <th className="px-3 py-2 text-right">Tekrar</th>
              <th className="px-3 py-2 text-right"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {deliveries.map((d) => {
              const tone = statusCodeTone(d.statusCode)
              const isRetrying = retrying.has(d.id)
              const wasRetried = retried.has(d.id)
              const Icon =
                tone === 'success' ? CheckCircle2 : tone === 'warn' ? AlertTriangle : tone === 'error' ? XCircle : RefreshCw
              return (
                <tr key={d.id} className="transition hover:bg-foreground/[0.02]">
                  <td className="px-3 py-2 align-top text-[11.5px] text-muted-foreground">
                    {relativeTime(d.attemptedAt)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="inline-flex items-center rounded-full bg-foreground/[0.06] px-2 py-0.5 font-mono text-[10px] text-foreground/75">
                      {d.event}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium',
                        TONE_STYLES[tone],
                      )}
                      data-testid="delivery-status-badge"
                      data-tone={tone}
                    >
                      <Icon className="h-3 w-3" />
                      {d.statusCode || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right align-top font-mono text-[11.5px] tabular-nums">
                    {d.responseTimeMs >= 1000
                      ? `${(d.responseTimeMs / 1000).toFixed(1)}s`
                      : `${d.responseTimeMs}ms`}
                  </td>
                  <td className="px-3 py-2 text-right align-top font-mono text-[11.5px] tabular-nums">
                    {d.retry ? (
                      <span className="text-amber-700 dark:text-amber-300">evet</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    {tone !== 'success' && (
                      <button
                        type="button"
                        onClick={() => handleRetry(d.id)}
                        disabled={isRetrying || wasRetried}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04] disabled:opacity-40"
                        aria-label={`${d.id} için tekrar dene`}
                      >
                        <RefreshCw className={cn('h-3 w-3', isRetrying && 'animate-spin')} />
                        {wasRetried ? 'sıraya alındı' : isRetrying ? 'gönderiliyor' : 'tekrar dene'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
