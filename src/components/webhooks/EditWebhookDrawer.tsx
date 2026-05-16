// Wave F11.C — Edit webhook endpoint drawer (right-slide).
// URL + 9-event grid + description + secret rotate + pause/resume +
// embedded DeliveryHistoryView at the bottom.

import { useEffect, useMemo, useState } from 'react'
import {
  X,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Pause,
  Play,
  Save,
} from '@landx/icons'
import { cn } from '@landx/ui'
import {
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_DESCRIPTIONS,
  WEBHOOK_EVENT_LABELS,
  isValidWebhookUrl,
  pauseEndpoint,
  resumeEndpoint,
  rotateSecret,
  updateEndpoint,
  type WebhookEndpoint,
  type WebhookEvent,
} from '@/lib/platform-webhooks'
import { DeliveryHistoryView } from './DeliveryHistoryView'

interface Props {
  endpoint: WebhookEndpoint | null
  onClose: () => void
  onUpdated: (endpoint: WebhookEndpoint) => void
}

const STATUS_TONE: Record<WebhookEndpoint['status'], string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  paused: 'bg-stone-500/10 text-stone-700 dark:text-stone-300',
  failing: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

const STATUS_LABEL: Record<WebhookEndpoint['status'], string> = {
  active: 'Aktif',
  paused: 'Duraklatıldı',
  failing: 'Hata',
}

export function EditWebhookDrawer({ endpoint, onClose, onUpdated }: Props) {
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [description, setDescription] = useState('')
  const [secret, setSecret] = useState('')
  const [status, setStatus] = useState<WebhookEndpoint['status']>('active')
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync local state when endpoint changes.
  useEffect(() => {
    if (!endpoint) return
    setUrl(endpoint.url)
    setEvents(endpoint.events)
    setDescription(endpoint.description ?? '')
    setSecret(endpoint.secret)
    setStatus(endpoint.status)
    setRevealed(false)
    setCopied(false)
    setSaving(false)
  }, [endpoint])

  // Esc closes.
  useEffect(() => {
    if (!endpoint) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [endpoint, onClose])

  const urlValid = useMemo(() => isValidWebhookUrl(url.trim()), [url])
  const canSave = endpoint != null && urlValid && events.length > 0

  if (!endpoint) return null

  const toggleEvent = (ev: WebhookEvent) => {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev]))
  }

  const handleRotate = () => {
    const updated = rotateSecret(endpoint.id)
    if (updated) {
      setSecret(updated.secret)
      setRevealed(true)
      setCopied(false)
      onUpdated(updated)
    }
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

  const handleTogglePause = () => {
    const updated = status === 'active' ? pauseEndpoint(endpoint.id) : resumeEndpoint(endpoint.id)
    if (updated) {
      setStatus(updated.status)
      onUpdated(updated)
    }
  }

  const handleSave = () => {
    if (!canSave) return
    setSaving(true)
    const updated = updateEndpoint(endpoint.id, {
      url: url.trim(),
      events,
      description: description.trim(),
    })
    setSaving(false)
    if (updated) {
      onUpdated(updated)
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
        aria-label="Webhook endpoint düzenle"
        className="fixed inset-y-0 right-0 z-50 flex w-[min(720px,calc(100vw-2rem))] flex-col border-l border-border bg-card shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                WEBHOOK · DÜZENLE
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium',
                  STATUS_TONE[status],
                )}
                data-testid="endpoint-status-badge"
              >
                {STATUS_LABEL[status]}
              </span>
            </div>
            <h2 className="mt-1 truncate font-serif text-lg font-medium leading-tight">
              {endpoint.id}
            </h2>
            <code className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
              {endpoint.url}
            </code>
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

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* URL */}
          <div>
            <label htmlFor="edit-url" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              URL
            </label>
            <input
              id="edit-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={cn(
                'w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground',
                !urlValid && url.length > 0 ? 'border-rose-500/60' : 'border-border',
              )}
            />
          </div>

          {/* Events */}
          <fieldset>
            <legend className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Olaylar ({events.length}/{WEBHOOK_EVENTS.length})
            </legend>
            <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
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
          </fieldset>

          {/* Description */}
          <div>
            <label htmlFor="edit-description" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Açıklama
            </label>
            <textarea
              id="edit-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </div>

          {/* Secret */}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              İmzalama anahtarı
            </label>
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-2 py-1.5">
              <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/90">
                {revealed ? secret : `${'•'.repeat(28)}${secret.slice(-4)}`}
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
                onClick={handleRotate}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04]"
              >
                <RefreshCw className="h-3 w-3" />
                Yeniden oluştur
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Anahtarı döndürmek mevcut entegrasyonları geçici olarak kıracaktır.
            </p>
          </div>

          {/* Pause / Resume */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-3 py-2.5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Durum
              </div>
              <p className="mt-0.5 text-[12.5px]">
                {status === 'active'
                  ? 'Endpoint olayları işliyor.'
                  : status === 'paused'
                    ? 'Duraklatıldı — yeni olaylar gönderilmiyor.'
                    : 'Sürekli hata veriyor — yeniden açmadan önce inceleyin.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleTogglePause}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-[12.5px] font-medium transition hover:bg-foreground/[0.04]"
              data-testid="pause-resume-toggle"
            >
              {status === 'active' ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> Duraklat
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Devam ettir
                </>
              )}
            </button>
          </div>

          {/* Delivery history */}
          <div>
            <DeliveryHistoryView endpointId={endpoint.id} />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-foreground/[0.04]"
          >
            Kapat
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
          </button>
        </footer>
      </div>
    </>
  )
}
