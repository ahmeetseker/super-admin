// Wave F11.C — Create webhook endpoint dialog.
// URL (https://), 9-event grid, optional description, auto-generated secret reveal.

import { useEffect, useMemo, useState } from 'react'
import { X, Copy, Check, RefreshCw, Eye, EyeOff } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_DESCRIPTIONS,
  WEBHOOK_EVENT_LABELS,
  createEndpoint,
  generateSecret,
  isValidWebhookUrl,
  type WebhookEndpoint,
  type WebhookEvent,
} from '@/lib/platform-webhooks'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (endpoint: WebhookEndpoint) => void
}

export function CreateWebhookDialog({ open, onClose, onCreated }: Props) {
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [description, setDescription] = useState('')
  const [secret, setSecret] = useState(() => generateSecret())
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [touched, setTouched] = useState(false)

  // Reset on close.
  useEffect(() => {
    if (!open) return
    setUrl('')
    setEvents([])
    setDescription('')
    setSecret(generateSecret())
    setRevealed(false)
    setCopied(false)
    setTouched(false)
  }, [open])

  // Esc closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const urlValid = useMemo(() => isValidWebhookUrl(url.trim()), [url])
  const canSubmit = urlValid && events.length > 0

  if (!open) return null

  const toggleEvent = (ev: WebhookEvent) => {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev]))
  }

  const handleRegenerate = () => {
    setSecret(generateSecret())
    setCopied(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    const created = createEndpoint({
      url: url.trim(),
      events,
      description: description.trim() || undefined,
      secret,
    })
    onCreated(created)
    onClose()
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
        aria-label="Yeni webhook oluştur"
        className="fixed left-1/2 top-1/2 z-50 flex w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              WEBHOOK · YENİ
            </div>
            <h2 className="mt-1 font-serif text-xl font-medium leading-tight">
              Yeni endpoint oluştur
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Olayları abone olacağınız bir HTTPS adres tanımlayın. Secret otomatik üretilir.
            </p>
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

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* URL */}
          <div>
            <label htmlFor="webhook-url" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              URL
            </label>
            <input
              id="webhook-url"
              type="url"
              required
              placeholder="https://example.com/hooks/arsam"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setTouched(true)}
              className={cn(
                'w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground',
                touched && !urlValid && url.length > 0 ? 'border-rose-500/60' : 'border-border',
              )}
              autoFocus
            />
            {touched && url.length > 0 && !urlValid && (
              <p className="mt-1 text-[11.5px] text-rose-600 dark:text-rose-400">
                Geçerli bir HTTPS adresi girin (örn. https://hooks.ofis.com/arsam).
              </p>
            )}
          </div>

          {/* Events */}
          <fieldset>
            <legend className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Olaylar ({events.length}/{WEBHOOK_EVENTS.length})
            </legend>
            <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2" data-testid="event-grid">
              {WEBHOOK_EVENTS.map((ev) => {
                const checked = events.includes(ev)
                return (
                  <label
                    key={ev}
                    title={WEBHOOK_EVENT_DESCRIPTIONS[ev]}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] transition',
                      checked
                        ? 'border-foreground/40 bg-foreground/[0.04]'
                        : 'border-border bg-background/40 hover:bg-foreground/[0.02]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEvent(ev)}
                      className="mt-0.5 h-3.5 w-3.5 flex-none accent-foreground"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[11px]">{ev}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {WEBHOOK_EVENT_LABELS[ev]}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            {touched && events.length === 0 && (
              <p className="mt-1 text-[11.5px] text-rose-600 dark:text-rose-400">
                En az bir olay seçin.
              </p>
            )}
          </fieldset>

          {/* Description */}
          <div>
            <label htmlFor="webhook-description" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Açıklama (opsiyonel)
            </label>
            <textarea
              id="webhook-description"
              rows={2}
              placeholder="CRM senkronizasyonu, Slack uyarısı, vs."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </div>

          {/* Secret reveal */}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              İmzalama anahtarı (32-char hex)
            </label>
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-2 py-1.5">
              <code
                data-testid="webhook-secret-value"
                className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/90"
              >
                {revealed ? secret : '•'.repeat(32)}
              </code>
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                aria-label={revealed ? 'Anahtarı gizle' : 'Anahtarı göster'}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground"
              >
                {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Anahtarı kopyala"
                className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04]"
              >
                <RefreshCw className="h-3 w-3" />
                Yeniden oluştur
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Bu anahtarla giden istekler imzalanır. Kapatınca yeniden açılmaz — şimdi kopyalayın.
            </p>
          </div>
        </form>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-foreground/[0.04]"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Endpoint oluştur
          </button>
        </footer>
      </div>
    </>
  )
}
