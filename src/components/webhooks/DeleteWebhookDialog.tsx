// Wave F11.C — Delete webhook endpoint confirmation dialog.

import { useEffect } from 'react'
import { X, AlertTriangle, Trash2 } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  deleteEndpoint,
  getLastDelivery,
  statusCodeTone,
  type WebhookEndpoint,
} from '@/lib/platform-webhooks'

interface Props {
  endpoint: WebhookEndpoint | null
  onClose: () => void
  onDeleted: (id: string) => void
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

export function DeleteWebhookDialog({ endpoint, onClose, onDeleted }: Props) {
  useEffect(() => {
    if (!endpoint) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [endpoint, onClose])

  if (!endpoint) return null

  const lastDelivery = getLastDelivery(endpoint.id)
  const tone = lastDelivery ? statusCodeTone(lastDelivery.statusCode) : 'neutral'

  const handleDelete = () => {
    const ok = deleteEndpoint(endpoint.id)
    if (ok) {
      onDeleted(endpoint.id)
      onClose()
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Webhook endpoint sil"
        className="fixed left-1/2 top-1/2 z-50 flex w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
              WEBHOOK · SİL
            </div>
            <h2 className="mt-1 font-serif text-lg font-medium leading-tight">
              {endpoint.id} silinsin mi?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 px-5 py-4">
          <p className="text-[13px] text-foreground/85">
            <code className="font-mono text-[11.5px] text-foreground/90">{endpoint.url}</code>
          </p>

          <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-rose-600 dark:text-rose-400" />
            <div className="text-[12.5px] leading-relaxed text-foreground/85">
              <strong className="font-medium text-foreground">Bu işlem geri alınamaz.</strong>{' '}
              Bu endpoint'in tüm gönderim geçmişi de silinecek.
            </div>
          </div>

          {lastDelivery ? (
            <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Son teslimat
              </div>
              <div className="mt-1 flex items-center gap-2 text-[12.5px]">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium',
                    TONE_STYLES[tone],
                  )}
                >
                  {lastDelivery.statusCode || '—'}
                </span>
                <span className="font-mono text-[11px] text-foreground/85">
                  {lastDelivery.event}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-[11.5px] text-muted-foreground">
                  {relativeTime(lastDelivery.attemptedAt)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">Bu endpoint için kaydı geçmiş teslimat yok.</p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-foreground/[0.04]"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
            data-testid="confirm-delete-webhook"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Endpoint'i sil
          </button>
        </footer>
      </div>
    </>
  )
}
