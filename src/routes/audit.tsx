import { useMemo, useState } from 'react'
import { FileText, Search, CheckCircle2, XCircle, User, Cpu, FileJson, Table as TableIcon } from '@landx/icons'
import { PageShell, cn, SkeletonRow } from '@landx/ui'
import { useAuditLog, useTenants, type AuditEntry } from '@landx/data'
import { AuditDrawer } from '@/components/audit/AuditDrawer'
import {
  AdvancedFilterPanel,
  type AdvancedFilterValue,
  type AuditSeverity,
} from '@/components/audit/AdvancedFilterPanel'
import { createPresetRange } from '@/lib/super-admin-time-range'
import { downloadCsv, downloadJson } from '@/lib/export'

// Wave F13.B — derive a "severity" from the existing audit row shape so the
// AdvancedFilterPanel chip group has something to bind to.
function severityOf(entry: AuditEntry): AuditSeverity {
  if (entry.outcome === 'failure') return 'error'
  const prefix = entry.action.split('.')[0]
  if (prefix === 'pii' || prefix === 'permission' || prefix === 'audit') return 'warn'
  return 'info'
}

const OUTCOME_TONE: Record<AuditEntry['outcome'], string> = {
  success: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-400/10',
  failure: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-400/10',
}

const ACTION_TONE: Record<string, string> = {
  'tenant': 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  'pii': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'auth': 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  'webhook': 'bg-foreground/[0.06] text-foreground/80',
  'plan': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'plugin': 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  'audit': 'bg-stone-500/10 text-stone-700 dark:text-stone-300',
  'system': 'bg-foreground/[0.06] text-foreground/80',
  'backup': 'bg-foreground/[0.06] text-foreground/80',
  'user': 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  'listing': 'bg-foreground/[0.06] text-foreground/80',
  'permission': 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

function actionPrefix(action: string) {
  return action.split('.')[0]
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

function absoluteTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function Audit() {
  const [q, setQ] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | AuditEntry['outcome']>('all')
  const [tenantFilter, setTenantFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null)
  // Wave F13.B — advanced filter state (actor combobox + severity + range + full-text).
  const [advanced, setAdvanced] = useState<AdvancedFilterValue>(() => ({
    actor: '',
    severities: [],
    range: createPresetRange('30d'),
    fullText: '',
  }))

  // Tenant directory used only for the filter dropdown labels — small, no
  // pagination needed. Audit log: single unfiltered fetch, client-side
  // refinement (the dataset is curated demo data and CSV export needs full
  // visibility anyway).
  const { data: tenants = [] } = useTenants({})
  const { data: auditPage, isPending: auditPending } = useAuditLog({})
  const auditEntries = useMemo(() => auditPage?.data ?? [], [auditPage])
  const showSkeleton = auditPending && auditEntries.length === 0

  const actionPrefixes = useMemo(() => {
    const set = new Set<string>()
    auditEntries.forEach((e) => set.add(actionPrefix(e.action)))
    return Array.from(set).sort()
  }, [auditEntries])

  const actorOptions = useMemo(() => {
    const set = new Set<string>()
    auditEntries.forEach((e) => set.add(e.actor))
    return Array.from(set).sort()
  }, [auditEntries])

  const filtered = useMemo(() => {
    const fullTextNeedle = advanced.fullText.trim().toLocaleLowerCase('tr-TR')
    const actorNeedle = advanced.actor.trim().toLocaleLowerCase('tr-TR')
    return auditEntries.filter((e) => {
      if (outcomeFilter !== 'all' && e.outcome !== outcomeFilter) return false
      if (tenantFilter !== 'all') {
        if (tenantFilter === '__platform' && e.tenantId !== null) return false
        if (tenantFilter !== '__platform' && e.tenantId !== tenantFilter) return false
      }
      if (actionFilter !== 'all' && actionPrefix(e.action) !== actionFilter) return false
      if (q) {
        const blob = `${e.id} ${e.actor} ${e.action} ${e.resourceType} ${e.resourceId} ${e.ip}`.toLocaleLowerCase('tr-TR')
        if (!blob.includes(q.toLocaleLowerCase('tr-TR'))) return false
      }
      if (actorNeedle.length > 0) {
        if (!e.actor.toLocaleLowerCase('tr-TR').includes(actorNeedle)) return false
      }
      if (advanced.severities.length > 0) {
        if (!advanced.severities.includes(severityOf(e))) return false
      }
      const tsMs = Date.parse(e.atISO)
      if (!Number.isNaN(tsMs)) {
        if (tsMs < advanced.range.startMs || tsMs > advanced.range.endMs) return false
      }
      if (fullTextNeedle.length > 0) {
        const blob = `${e.id} ${e.actor} ${e.action} ${e.resourceType} ${e.resourceId} ${e.ip} ${e.userAgent} ${e.metadata ? JSON.stringify(e.metadata) : ''}`.toLocaleLowerCase('tr-TR')
        if (!blob.includes(fullTextNeedle)) return false
      }
      return true
    })
  }, [q, outcomeFilter, tenantFilter, actionFilter, auditEntries, advanced])

  const totalThisMonth = auditEntries.length
  const successCount = auditEntries.filter((e) => e.outcome === 'success').length
  const successRate = totalThisMonth > 0 ? Math.round((successCount / totalThisMonth) * 100) : 0
  const uniqueActors = new Set(auditEntries.map((e) => e.actor)).size
  const lastFailure = auditEntries.filter((e) => e.outcome === 'failure').sort((a, b) => b.atISO.localeCompare(a.atISO))[0]

  const handleExport = (format: 'csv' | 'json') => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `arsam-audit-${ts}.${format}`
    if (format === 'json') {
      downloadJson(filename, filtered)
    } else {
      // Flat columns for CSV — metadata as JSON string in last column
      const rows = filtered.map((e) => ({
        id: e.id,
        atISO: e.atISO,
        actor: e.actor,
        action: e.action,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        tenantId: e.tenantId ?? '',
        ip: e.ip,
        userAgent: e.userAgent,
        outcome: e.outcome,
        metadata: e.metadata ? JSON.stringify(e.metadata) : '',
      }))
      downloadCsv(filename, rows)
    }
  }

  return (
    <PageShell
      eyebrow="MOD · D01 · AUDIT LOG"
      title={
        <>
          Olay <em className="font-serif italic font-light">izleri</em>
        </>
      }
      description={`${auditEntries.length} kayıt · ${successRate}% başarı · ${uniqueActors} farklı aktör. Event sourcing temelli, immutable.`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            aria-label="Audit log'u CSV olarak indir"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            <TableIcon className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('json')}
            aria-label="Audit log'u JSON olarak indir"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            <FileJson className="h-3.5 w-3.5" />
            JSON
          </button>
        </div>
      }
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Bu ay olay" value={String(totalThisMonth)} hint="immutable kayıt" />
        <Stat label="Başarı oranı" value={`${successRate}%`} hint={`${totalThisMonth - successCount} başarısız`} />
        <Stat label="Aktif aktör" value={String(uniqueActors)} hint="insan + system" />
        <Stat label="Son başarısızlık" value={lastFailure ? relativeTime(lastFailure.atISO) : '—'} hint={lastFailure?.action ?? 'temiz'} />
      </section>

      <AdvancedFilterPanel
        value={advanced}
        onChange={setAdvanced}
        actorOptions={actorOptions}
      />

      <section className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Aktör, kaynak, IP, ID…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Audit ara"
          />
        </div>
        <Select value={actionFilter} onChange={setActionFilter} label="Aksiyon">
          <option value="all">Tüm aksiyonlar</option>
          {actionPrefixes.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <Select value={tenantFilter} onChange={setTenantFilter} label="Tenant">
          <option value="all">Tüm tenant'lar</option>
          <option value="__platform">Platform-level</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {(['all', 'success', 'failure'] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOutcomeFilter(o)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition',
                outcomeFilter === o ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {o === 'all' ? 'Hepsi' : o === 'success' ? 'Başarılı' : 'Başarısız'}
            </button>
          ))}
        </div>
      </section>

      {showSkeleton ? (
        <div
          data-testid="audit-skeleton"
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonRow key={i} cells={6} />
          ))}
        </div>
      ) : (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-4 py-2.5">Zaman</th>
                <th className="px-4 py-2.5">Aktör</th>
                <th className="px-4 py-2.5">Aksiyon</th>
                <th className="px-4 py-2.5">Kaynak</th>
                <th className="px-4 py-2.5">Tenant</th>
                <th className="px-4 py-2.5">IP</th>
                <th className="px-4 py-2.5">Sonuç</th>
                <th className="w-16 px-3 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const tone = ACTION_TONE[actionPrefix(e.action)] ?? 'bg-foreground/[0.06] text-foreground/80'
                const tenantName = e.tenantId ? tenants.find((t) => t.id === e.tenantId)?.name ?? e.tenantId : null
                return (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedEntry(e)}
                    className="cursor-pointer border-b border-border/60 transition hover:bg-foreground/[0.02] last:border-0"
                  >
                    <td className="px-4 py-3 align-top" title={absoluteTime(e.atISO)}>
                      <div className="text-[13px]">{relativeTime(e.atISO)}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{e.id}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-foreground/[0.06]">
                          {e.actor === 'system' || e.actor.startsWith('arsam-') ? (
                            <Cpu className="h-3.5 w-3.5 text-foreground/70" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-foreground/70" />
                          )}
                        </span>
                        <div className="text-[13px]">{e.actor}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px]', tone)}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-[13px]">{e.resourceType}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{e.resourceId}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-[13px]">
                      {tenantName ?? <span className="text-muted-foreground italic">platform</span>}
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-[11px] text-muted-foreground">{e.ip}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', OUTCOME_TONE[e.outcome])}>
                        {e.outcome === 'success' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {e.outcome === 'success' ? 'Başarılı' : 'Başarısız'}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); setSelectedEntry(e) }}
                        aria-label={`${e.id} detayını aç`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                      >
                        Detay
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-4 w-4" />
                    Eşleşen audit kaydı yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <AuditDrawer entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </PageShell>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}

function Select({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: React.ReactNode }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[13px] outline-none [&>option]:bg-background"
      >
        {children}
      </select>
    </label>
  )
}
