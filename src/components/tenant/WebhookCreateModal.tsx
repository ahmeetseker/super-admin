// Wave F13.B — Tenant-scoped webhook quick-create modal.
// Wraps lib/platform-webhooks `createEndpoint` (the F11 store at
// arsam.platform-webhooks.v1). Renders the 9-event grid + auto-generated
// 32-hex secret preview + URL field, then closes on success.

import { useEffect, useMemo, useState } from 'react'
import { X } from '@landx/icons'
import {
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_LABELS,
  createEndpoint,
  generateSecret,
  isValidWebhookUrl,
  type WebhookEvent,
} from '@/lib/platform-webhooks'

export interface WebhookCreateModalProps {
  tenantId: string
  tenantName: string
  onClose: () => void
  onCreated?: (endpointId: string) => void
}

const DEFAULT_EVENTS: WebhookEvent[] = ['listing.created', 'listing.updated']

export function WebhookCreateModal({
  tenantId,
  tenantName,
  onClose,
  onCreated,
}: WebhookCreateModalProps) {
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<Set<WebhookEvent>>(
    () => new Set(DEFAULT_EVENTS),
  )
  const [secret, setSecret] = useState(() => generateSecret())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Close on Escape — small UX nicety, matches the rest of the modal suite.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const urlValid = useMemo(() => isValidWebhookUrl(url), [url])
  const canSubmit = urlValid && selectedEvents.size > 0 && !busy

  const toggleEvent = (event: WebhookEvent) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(event)) next.delete(event)
      else next.add(event)
      return next
    })
  }

  const handleSubmit = () => {
    if (!canSubmit) {
      if (!urlValid) setError('Geçerli bir HTTPS URL girin.')
      else if (selectedEvents.size === 0) setError('En az bir olay seçilmeli.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const created = createEndpoint({
        url,
        events: Array.from(selectedEvents),
        description: `Tenant: ${tenantName} (${tenantId})`,
        secret,
      })
      onCreated?.(created.id)
      onClose()
    } catch (err) {
      setError((err as Error).message ?? 'Webhook oluşturulamadı.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Webhook ekle"
      data-testid="webhook-create-modal"
      className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <section
        className="w-[min(600px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              TENANT WEBHOOK
            </div>
            <h3 className="font-serif text-lg">Webhook ekle</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {tenantName} ({tenantId}) için yeni endpoint. Otomatik üretilen secret retry imzalama
              için kullanılır.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="webhook-url"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              ENDPOINT URL
            </label>
            <input
              id="webhook-url"
              type="url"
              data-testid="webhook-url-input"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (error) setError(null)
              }}
              placeholder="https://example.com/hooks/arsam"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-[hsl(var(--placeholder))] focus:border-foreground"
            />
            {!urlValid && url.length > 0 && (
              <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">HTTPS URL gerekli.</p>
            )}
          </div>

          <fieldset>
            <legend className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              OLAYLAR ({selectedEvents.size}/{WEBHOOK_EVENTS.length})
            </legend>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {WEBHOOK_EVENTS.map((event) => {
                const checked = selectedEvents.has(event)
                return (
                  <label
                    key={event}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-2.5 py-1.5 text-[12.5px] transition hover:bg-foreground/5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEvent(event)}
                      data-testid={`webhook-event-${event}`}
                      className="h-3.5 w-3.5 accent-foreground"
                    />
                    <span className="flex-1">{WEBHOOK_EVENT_LABELS[event]}</span>
                    <code className="font-mono text-[10px] text-muted-foreground">{event}</code>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="webhook-secret"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              SECRET (32-hex)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="webhook-secret"
                type="text"
                readOnly
                value={secret}
                data-testid="webhook-secret-display"
                className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 font-mono text-[11.5px] text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setSecret(generateSecret())}
                className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
              >
                Yenile
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Bu secret bir kez gösterilir; oluşturduktan sonra rotate komutuyla değiştirilir.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-border bg-rose-500/10 px-3 py-2 text-[12px] text-rose-600 dark:text-rose-300"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="webhook-create-submit"
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Oluştur
          </button>
        </footer>
      </section>
    </div>
  )
}

export default WebhookCreateModal
