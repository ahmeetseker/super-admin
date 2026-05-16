// Wave F11.C — /ops/webhooks page.
// Reads/writes via lib/platform-webhooks (localStorage-backed; seeded from
// @landx/data on first load). Adds full CRUD + per-row pause/resume/delete/edit/test.
// WebhookTestModal preserved (uses @landx/data shape — adapted on open).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Plus, Pause, Play, Pencil, Trash2, Send } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import type { WebhookEndpoint as LegacyEndpoint, WebhookEvent as LegacyEvent } from '@landx/data'
import {
  getEndpoints,
  getLastDelivery,
  getEndpointTotals,
  pauseEndpoint as pauseEp,
  resumeEndpoint as resumeEp,
  subscribePlatformWebhooks,
  type WebhookEndpoint,
  type WebhookEvent,
} from '@/lib/platform-webhooks'
import { WebhookTestModal } from '@/components/webhooks/WebhookTestModal'
import { CreateWebhookDialog } from '@/components/webhooks/CreateWebhookDialog'
import { EditWebhookDrawer } from '@/components/webhooks/EditWebhookDrawer'
import { DeleteWebhookDialog } from '@/components/webhooks/DeleteWebhookDialog'

const STATUS_TONE: Record<WebhookEndpoint['status'], string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  paused: 'bg-stone-500/10 text-stone-700 dark:text-stone-300',
  failing: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

const STATUS_DOT: Record<WebhookEndpoint['status'], string> = {
  active: 'bg-emerald-500',
  paused: 'bg-stone-500',
  failing: 'bg-rose-500 animate-pulse',
}

const STATUS_LABEL: Record<WebhookEndpoint['status'], string> = {
  active: 'Aktif',
  paused: 'Duraklatıldı',
  failing: 'Hata',
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

function urlTruncate(url: string, max = 48): string {
  if (url.length <= max) return url
  return url.slice(0, max - 1) + '…'
}

/** Map the new 9-event vocab to closest legacy event so WebhookTestModal works. */
function mapNewEventToLegacy(ev: WebhookEvent): LegacyEvent {
  switch (ev) {
    case 'listing.created':
      return 'listing.created'
    case 'listing.updated':
      return 'listing.updated'
    case 'listing.deleted':
      return 'listing.deleted'
    case 'tenant.created':
    case 'user.created':
      return 'customer.created'
    case 'tenant.suspended':
    case 'user.deleted':
      return 'customer.stage_changed'
    case 'compliance.alert':
      return 'audit.high_risk'
    case 'audit.action':
      return 'audit.high_risk'
    default:
      return 'listing.published'
  }
}

/** Build a legacy-shape endpoint adapter for the existing test modal. */
function toLegacyEndpoint(ep: WebhookEndpoint): LegacyEndpoint {
  const legacyEvents = Array.from(new Set(ep.events.map(mapNewEventToLegacy)))
  return {
    id: ep.id,
    tenantId: '—',
    url: ep.url,
    events: legacyEvents.length > 0 ? legacyEvents : ['listing.published'],
    status: ep.status,
    secretHint: `··· ${ep.secret.slice(-4)}`,
    createdISO: new Date(ep.createdAt).toISOString(),
    lastDeliveryISO: ep.lastDeliveryAt ? new Date(ep.lastDeliveryAt).toISOString() : null,
    successRate30d: ep.status === 'failing' ? 0.62 : ep.status === 'paused' ? 1.0 : 0.99,
    totalDeliveries: 30,
    failureCount30d: ep.failureCount,
  }
}

export function Webhooks() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>(() => getEndpoints())
  const [createOpen, setCreateOpen] = useState(false)
  const [editEndpoint, setEditEndpoint] = useState<WebhookEndpoint | null>(null)
  const [deleteEndpoint, setDeleteEndpoint] = useState<WebhookEndpoint | null>(null)
  const [testEndpoint, setTestEndpoint] = useState<WebhookEndpoint | null>(null)

  const refresh = useCallback(() => {
    setEndpoints(getEndpoints())
  }, [])

  useEffect(() => {
    const unsub = subscribePlatformWebhooks(refresh)
    refresh()
    return unsub
  }, [refresh])

  const totals = useMemo(() => getEndpointTotals(), [endpoints])
  const total = totals.total

  const handleTogglePause = (ep: WebhookEndpoint) => {
    if (ep.status === 'active') pauseEp(ep.id)
    else resumeEp(ep.id)
    refresh()
  }

  return (
    <PageShell
      eyebrow="OPS · WEBHOOK HUB"
      title={
        <>
          Webhook <em className="font-serif italic font-light">teslimatları</em>
        </>
      }
      description={`${total} uç nokta · ${totals.active} aktif · ${totals.paused} duraklatıldı · ${totals.failing} hata veriyor.`}
      actions={
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          data-testid="create-webhook-cta"
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Yeni endpoint
        </button>
      }
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Toplam uç nokta" value={String(totals.total)} hint={`${totals.active} aktif`} />
        <Stat label="Aktif" value={String(totals.active)} hint={`${totals.total - totals.active} kapalı/hata`} />
        <Stat
          label="Duraklatıldı"
          value={String(totals.paused)}
          hint={totals.paused > 0 ? 'manuel' : 'yok'}
        />
        <Stat
          label="Hata veren"
          value={String(totals.failing)}
          hint={totals.failing > 0 ? 'incele' : 'temiz'}
          tone={totals.failing > 0 ? 'warn' : undefined}
        />
      </section>

      {totals.failing > 0 && (
        <section className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-rose-600 dark:text-rose-400" />
          <div className="text-[13px] leading-relaxed text-foreground/80">
            <strong className="font-medium text-foreground">{totals.failing} uç nokta hata veriyor.</strong>{' '}
            Detayları görmek ve sırayla yeniden denemek için endpoint satırından "Düzenle" → teslimat geçmişine bakın.
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-lg font-light tracking-tight">Uç noktalar</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {endpoints.length} kayıt
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {endpoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
              <p className="text-[14px] font-medium">Henüz endpoint yok</p>
              <p className="text-[12px] text-muted-foreground">
                "Yeni endpoint" ile ilk webhook adresinizi tanımlayın.
              </p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" /> Yeni endpoint
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]" data-testid="endpoints-table">
                <thead className="border-b border-border bg-background/30">
                  <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-3 py-2.5">ID</th>
                    <th className="px-3 py-2.5 min-w-[260px]">URL</th>
                    <th className="px-3 py-2.5">Olaylar</th>
                    <th className="px-3 py-2.5">Durum</th>
                    <th className="px-3 py-2.5 text-right">Son teslimat</th>
                    <th className="px-3 py-2.5 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {endpoints.map((e) => {
                    const last = getLastDelivery(e.id)
                    return (
                      <tr
                        key={e.id}
                        className="transition hover:bg-foreground/[0.02]"
                        data-testid="endpoint-row"
                        data-endpoint-id={e.id}
                      >
                        <td className="px-3 py-3 align-top">
                          <div className="font-mono text-[11.5px] tabular-nums text-foreground/90">{e.id}</div>
                          {e.description && (
                            <div className="text-[11.5px] text-muted-foreground">{e.description}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="font-mono text-[11.5px] text-foreground/85" title={e.url}>
                            {urlTruncate(e.url, 44)}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            secret ··· {e.secret.slice(-4)}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-1">
                            {e.events.slice(0, 3).map((ev) => (
                              <span
                                key={ev}
                                className="inline-flex items-center rounded-full bg-foreground/[0.06] px-2 py-0.5 font-mono text-[10px] text-foreground/75"
                              >
                                {ev}
                              </span>
                            ))}
                            {e.events.length > 3 && (
                              <span className="inline-flex items-center rounded-full bg-foreground/[0.04] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                                +{e.events.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                              STATUS_TONE[e.status],
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[e.status])} />
                            {STATUS_LABEL[e.status]}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right align-top text-[11.5px] text-muted-foreground">
                          {last ? relativeTime(last.attemptedAt) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePause(e)}
                              aria-label={
                                e.status === 'active'
                                  ? `${e.id} duraklat`
                                  : `${e.id} devam ettir`
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11.5px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04]"
                            >
                              {e.status === 'active' ? (
                                <>
                                  <Pause className="h-3 w-3" />
                                  Duraklat
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3" />
                                  Devam
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setTestEndpoint(e)}
                              aria-label={`${e.id} için test webhook gönder`}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11.5px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04]"
                            >
                              <Send className="h-3 w-3" /> Test
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditEndpoint(e)}
                              aria-label={`${e.id} düzenle`}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11.5px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04]"
                            >
                              <Pencil className="h-3 w-3" /> Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteEndpoint(e)}
                              aria-label={`${e.id} sil`}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/[0.04] px-2 py-1 text-[11.5px] font-medium text-rose-700 transition hover:bg-rose-500/[0.08] dark:text-rose-300"
                            >
                              <Trash2 className="h-3 w-3" /> Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <CreateWebhookDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refresh}
      />
      <EditWebhookDrawer
        endpoint={editEndpoint}
        onClose={() => setEditEndpoint(null)}
        onUpdated={refresh}
      />
      <DeleteWebhookDialog
        endpoint={deleteEndpoint}
        onClose={() => setDeleteEndpoint(null)}
        onDeleted={refresh}
      />
      <WebhookTestModal
        endpoint={testEndpoint ? toLegacyEndpoint(testEndpoint) : null}
        onClose={() => setTestEndpoint(null)}
      />
    </PageShell>
  )
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone?: 'warn'
}) {
  return (
    <article
      className={cn(
        'rounded-2xl border bg-card p-4',
        tone === 'warn' ? 'border-rose-500/30 bg-rose-500/[0.04]' : 'border-border',
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-1 font-serif text-2xl font-light tabular-nums',
          tone === 'warn' ? 'text-rose-700 dark:text-rose-300' : '',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}
