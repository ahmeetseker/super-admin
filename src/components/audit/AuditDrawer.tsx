import { useEffect, useMemo, useState } from 'react'
import { X, Copy, Check, ExternalLink, Clock, MapPin, User, Activity } from '@landx/icons'
import { Link } from 'react-router'
import { cn, timeAgo } from '@landx/ui'
import { AUDIT_LOG, TENANTS, type AuditEntry } from '@landx/data'

export interface AuditDrawerProps {
  entry: AuditEntry | null  // null = closed
  onClose: () => void
}

export function AuditDrawer({ entry, onClose }: AuditDrawerProps) {
  const [copied, setCopied] = useState(false)

  // Close on Esc
  useEffect(() => {
    if (!entry) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [entry, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!entry) return
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = orig }
  }, [entry])

  // Related entries: same actor in last 24h, OR same resource
  const related = useMemo(() => {
    if (!entry) return { byActor: [] as AuditEntry[], byResource: [] as AuditEntry[] }
    const entryTime = new Date(entry.atISO).getTime()
    const dayBefore = entryTime - 24 * 60 * 60 * 1000
    const dayAfter = entryTime + 24 * 60 * 60 * 1000
    const byActor = AUDIT_LOG
      .filter(e => e.id !== entry.id && e.actor === entry.actor && new Date(e.atISO).getTime() >= dayBefore && new Date(e.atISO).getTime() <= dayAfter)
      .slice(0, 5)
    const byResource = AUDIT_LOG
      .filter(e => e.id !== entry.id && e.resourceType === entry.resourceType && e.resourceId === entry.resourceId)
      .slice(0, 5)
    return { byActor, byResource }
  }, [entry])

  const tenantName = useMemo(() => {
    if (!entry?.tenantId) return null
    return TENANTS.find(t => t.id === entry.tenantId)?.name ?? entry.tenantId
  }, [entry])

  if (!entry) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard API blocked — silent
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={`Audit detayı ${entry.id}`}
        className="fixed inset-y-0 right-0 z-50 flex w-[min(560px,calc(100vw-2rem))] flex-col border-l border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>AUDIT</span>
              <span aria-hidden>·</span>
              <code className="text-foreground">{entry.id}</code>
            </div>
            <h2 className="mt-1 truncate font-serif text-xl font-light leading-tight tracking-tight">
              {entry.action}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-[12.5px]">
              <span
                aria-label={`Sonuç: ${entry.outcome === 'success' ? 'başarılı' : 'başarısız'}`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px]',
                  entry.outcome === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                )}
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                {entry.outcome === 'success' ? 'başarılı' : 'başarısız'}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{timeAgo(entry.atISO)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Detayı kapat"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Quick facts */}
          <section className="mb-5 space-y-2.5 text-[13px]">
            <Row icon={User} label="Aktör" value={entry.actor} mono />
            <Row icon={Activity} label="Kaynak" value={`${entry.resourceType} · ${entry.resourceId}`} mono />
            {tenantName && (
              <Row
                icon={MapPin}
                label="Tenant"
                valueNode={
                  <Link to={`/tenants/${entry.tenantId}`} onClick={onClose} className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                    {tenantName}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                }
              />
            )}
            <Row icon={Clock} label="Zaman" value={new Date(entry.atISO).toLocaleString('tr-TR')} mono />
            <Row icon={MapPin} label="IP" value={entry.ip} mono />
            <Row icon={Activity} label="User-Agent" value={entry.userAgent} />
          </section>

          {/* Metadata */}
          {entry.metadata && (
            <section className="mb-5">
              <header className="mb-2 flex items-baseline justify-between">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">METADATA</h3>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                  aria-label="JSON olarak kopyala"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-300" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'kopyalandı' : 'kopyala'}
                </button>
              </header>
              <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </section>
          )}

          {/* Related — same actor */}
          {related.byActor.length > 0 && (
            <section className="mb-5">
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                AYNI AKTÖR (24 SAAT)
              </h3>
              <ul className="space-y-1.5">
                {related.byActor.map(e => (
                  <li key={e.id} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <code className="flex-none font-mono text-[10px] text-muted-foreground">{e.action}</code>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{e.resourceType} · {e.resourceId}</span>
                    <span className="flex-none font-mono text-[10px] tabular-nums text-muted-foreground">
                      {timeAgo(e.atISO)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Related — same resource */}
          {related.byResource.length > 0 && (
            <section>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                AYNI KAYNAK
              </h3>
              <ul className="space-y-1.5">
                {related.byResource.map(e => (
                  <li key={e.id} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <code className="flex-none font-mono text-[10px] text-muted-foreground">{e.action}</code>
                    <span className="min-w-0 flex-1 truncate">{e.actor}</span>
                    <span className="flex-none font-mono text-[10px] tabular-nums text-muted-foreground">
                      {timeAgo(e.atISO)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-muted/40 px-5 py-3 text-[11px] text-muted-foreground">
          <kbd className="rounded bg-card px-1 font-mono">Esc</kbd> ile kapat ·
          KVKK kapsamında — bu olay 365 gün hot tier'da, sonra arşivlenir.
        </footer>
      </aside>
    </>
  )
}

function Row({ icon: Icon, label, value, valueNode, mono = false }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string
  valueNode?: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline gap-3">
      <Icon aria-hidden className="h-3.5 w-3.5 flex-none text-muted-foreground" />
      <dt className="w-20 flex-none font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 flex-1', mono ? 'font-mono text-[12px]' : 'text-[12.5px]')}>
        {valueNode ?? value}
      </dd>
    </div>
  )
}
