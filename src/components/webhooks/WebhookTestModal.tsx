import { useState, useEffect } from 'react'
import { X, Send, Check, AlertCircle, Copy } from '@landx/icons'
import { cn } from '@landx/ui'
import type { WebhookEndpoint, WebhookEvent } from '@landx/data'

const SAMPLE_PAYLOADS: Record<WebhookEvent, Record<string, unknown>> = {
  'listing.created': {
    event: 'listing.created',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: {
      id: 'NEW.123456',
      title: 'Yeni ilan örneği',
      city: 'Balıkesir',
      district: 'Ayvalık · Cunda',
      type: 'İmarlı',
      size: 1240,
      price: 8400000,
    },
  },
  'listing.updated': {
    event: 'listing.updated',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: { id: '28.AY.0142', changes: { price: { from: 8400000, to: 8000000 } } },
  },
  'listing.published': {
    event: 'listing.published',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: { id: '28.AY.0142', publishedAt: new Date().toISOString() },
  },
  'listing.deleted': {
    event: 'listing.deleted',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: { id: '28.AY.0142', reason: 'satıldı' },
  },
  'customer.created': {
    event: 'customer.created',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: { id: 'C-2026-0142', name: '*** ***', segment: 'Sıcak' },
  },
  'customer.stage_changed': {
    event: 'customer.stage_changed',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: { customerId: 'C-2026-0142', from: 'Görüşme', to: 'Teklif' },
  },
  'deal.created': {
    event: 'deal.created',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: { dealId: 'D-2026-0042', listingId: '28.AY.0142', customerId: 'C-2026-0142', value: 8400000 },
  },
  'deal.won': {
    event: 'deal.won',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: { dealId: 'D-2026-0042', finalPrice: 8200000 },
  },
  'deal.lost': {
    event: 'deal.lost',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: { dealId: 'D-2026-0042', reason: 'bütçe' },
  },
  'transaction.captured': {
    event: 'transaction.captured',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: { txId: 'TX-2026-0142', amount: 50000, currency: 'TRY' },
  },
  'transaction.failed': {
    event: 'transaction.failed',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: { txId: 'TX-2026-0142', errorCode: 'INSUFFICIENT_FUNDS' },
  },
  'audit.high_risk': {
    event: 'audit.high_risk',
    tenantId: 'atolye-ayv',
    timestamp: new Date().toISOString(),
    data: { auditId: 'AUD-2026-0142', riskScore: 0.87, factors: ['pii.access', 'after-hours'] },
  },
}

type ResultState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success'; status: number; durationMs: number; responseBody: string }
  | { kind: 'failed'; status: number; durationMs: number; errorMessage: string }

interface Props {
  endpoint: WebhookEndpoint | null // null = closed
  onClose: () => void
}

export function WebhookTestModal({ endpoint, onClose }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent>('listing.published')
  const [payloadJson, setPayloadJson] = useState('')
  const [result, setResult] = useState<ResultState>({ kind: 'idle' })
  const [copied, setCopied] = useState(false)

  // Reset state when endpoint changes
  useEffect(() => {
    if (!endpoint) return
    const firstEvent = (endpoint.events[0] ?? 'listing.published') as WebhookEvent
    setSelectedEvent(firstEvent)
    setPayloadJson(JSON.stringify(SAMPLE_PAYLOADS[firstEvent], null, 2))
    setResult({ kind: 'idle' })
  }, [endpoint])

  // Update payload when event changes
  useEffect(() => {
    setPayloadJson(JSON.stringify(SAMPLE_PAYLOADS[selectedEvent], null, 2))
  }, [selectedEvent])

  // Esc closes
  useEffect(() => {
    if (!endpoint) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [endpoint, onClose])

  if (!endpoint) return null

  const handleSend = async () => {
    // Validate JSON
    try {
      JSON.parse(payloadJson)
    } catch (e) {
      setResult({
        kind: 'failed',
        status: 0,
        durationMs: 0,
        errorMessage: `Geçersiz JSON: ${(e as Error).message}`,
      })
      return
    }

    setResult({ kind: 'sending' })
    const start = performance.now()

    // Mock: simulate network call. Real implementation would POST to endpoint.url.
    // Don't ACTUALLY make CORS request — it'll fail. Just simulate.
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400))

    const durationMs = Math.round(performance.now() - start)

    // 90% success simulation
    const mockSuccess = Math.random() > 0.1
    if (mockSuccess) {
      setResult({
        kind: 'success',
        status: 200,
        durationMs,
        responseBody: JSON.stringify({ received: true, eventId: `evt_${Date.now().toString(36)}` }, null, 2),
      })
    } else {
      setResult({
        kind: 'failed',
        status: 502,
        durationMs,
        errorMessage: 'Upstream timeout (simüle)',
      })
    }
  }

  const handleCopyCurl = async () => {
    const curl = `curl -X POST '${endpoint.url}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Arsam-Signature: ${endpoint.secretHint}_<computed>' \\
  -d '${payloadJson.replace(/\n/g, '').replace(/'/g, "'\\''")}'`
    try {
      await navigator.clipboard.writeText(curl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard may be unavailable (e.g. http context); silently ignore
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label="Webhook test gönderici"
        className="fixed inset-y-0 right-0 z-50 flex w-[min(640px,calc(100vw-2rem))] flex-col border-l border-border bg-card shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">WEBHOOK · TEST</div>
            <h2 className="mt-1 font-serif text-lg font-medium leading-tight">Mock teslimat gönder</h2>
            <code className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">{endpoint.url}</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Test panelini kapat"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div
            role="alert"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200"
          >
            Bu panel <strong>mock</strong> teslimat simüle eder. Gerçek POST yapmaz (CORS engelli). Faz 11.6.b'de proxy ile gerçek tetikleme.
          </div>

          <div>
            <label htmlFor="event-select" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              EVENT
            </label>
            <select
              id="event-select"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value as WebhookEvent)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            >
              {endpoint.events.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Bu endpoint <strong>{endpoint.events.length}</strong> event aboneliği yapıyor.
            </p>
          </div>

          <div>
            <label htmlFor="payload-input" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              PAYLOAD (düzenlenebilir)
            </label>
            <textarea
              id="payload-input"
              value={payloadJson}
              onChange={(e) => setPayloadJson(e.target.value)}
              rows={12}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-[11px] outline-none focus:border-foreground"
              spellCheck={false}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={result.kind === 'sending'}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {result.kind === 'sending' ? 'Gönderiliyor…' : 'Test gönder'}
            </button>
            <button
              type="button"
              onClick={handleCopyCurl}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'kopyalandı' : 'curl olarak kopyala'}
            </button>
          </div>

          {result.kind !== 'idle' && (
            <div
              className={cn(
                'rounded-xl border px-3 py-2.5',
                result.kind === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : result.kind === 'failed'
                    ? 'border-rose-500/40 bg-rose-500/10'
                    : 'border-border bg-muted/40',
              )}
            >
              {result.kind === 'sending' && <span className="text-[12.5px]">Gönderiliyor…</span>}
              {result.kind === 'success' && (
                <>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                    <span className="font-medium">200 OK</span>
                    <span className="text-muted-foreground">· {result.durationMs}ms</span>
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-background/60 p-2 font-mono text-[10.5px] leading-relaxed">
                    {result.responseBody}
                  </pre>
                </>
              )}
              {result.kind === 'failed' && (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-300" />
                  <span className="font-medium">
                    {result.status || 'ERR'} {result.errorMessage}
                  </span>
                  {result.durationMs > 0 && <span className="text-muted-foreground">· {result.durationMs}ms</span>}
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-border bg-muted/40 px-5 py-2.5 text-[11px] text-muted-foreground">
          <kbd className="rounded bg-card px-1 font-mono">Esc</kbd> ile kapat · Gerçek teslimatlar 365 gün hot retention.
        </footer>
      </div>
    </>
  )
}
