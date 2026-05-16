/**
 * /audit-chain — Wave F35 / Faz 2.
 *
 * Append-only Hash Chain audit viewer. Filter (actor / action / resource /
 * tarih), liste tablosu (id, at, actor, action, resource, hash kısaltılmış),
 * her satır expandable detay (full hash, prevHash, meta JSON), zincir bütünlük
 * doğrulama butonu (`useVerifyAuditChainIntegrity`).
 */
import { Fragment, useMemo, useState, useTransition } from 'react'
import { CheckCircle2, XCircle, ShieldCheck, ChevronRight } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  useAdminAuditChain,
  useVerifyAuditChainIntegrity,
  type AdminAuditEvent,
  type AuditFilter,
  type VerifyAuditChainResult,
} from '@landx/data'

function formatAbs(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
}

function shortHash(hash: string): string {
  return hash.length > 8 ? hash.slice(0, 8) : hash
}

function todayISO(offsetDays = 0): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export function AuditChain() {
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [resourcePrefix, setResourcePrefix] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [verifyResult, setVerifyResult] = useState<VerifyAuditChainResult | null>(null)
  const [, startTransition] = useTransition()

  const filter: AuditFilter = useMemo(() => {
    const f: AuditFilter = {}
    if (actor.trim()) f.actor = actor.trim()
    if (resourcePrefix.trim()) f.resourcePrefix = resourcePrefix.trim()
    if (from) f.from = `${from}T00:00:00.000Z`
    if (to) f.to = `${to}T23:59:59.999Z`
    return f
  }, [actor, resourcePrefix, from, to])

  const { data: events = [], isPending } = useAdminAuditChain(filter)
  const verifyMutation = useVerifyAuditChainIntegrity()

  // Action filter is a client-side post filter (server has no `action`).
  const filtered = useMemo<AdminAuditEvent[]>(() => {
    const needle = action.trim().toLowerCase()
    if (!needle) return events
    return events.filter((e) => e.action.toLowerCase().includes(needle))
  }, [events, action])

  function handleVerify() {
    startTransition(() => {
      verifyMutation.mutate(undefined, {
        onSuccess: (res) => setVerifyResult(res),
      })
    })
  }

  function clearFilters() {
    setActor('')
    setAction('')
    setResourcePrefix('')
    setFrom('')
    setTo('')
  }

  const actors = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => set.add(e.actor))
    return Array.from(set).sort()
  }, [events])

  return (
    <PageShell
      eyebrow="MOD · D01 · AUDIT"
      title={
        <>
          Hash <em className="font-serif italic font-light">zinciri</em>
        </>
      }
      description={`${filtered.length} event · append-only · prevHash linkleme. "Zincir bütünlüğünü doğrula" tüm chain'i tek tek kontrol eder.`}
      actions={
        <button
          type="button"
          onClick={handleVerify}
          disabled={verifyMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {verifyMutation.isPending ? 'Doğrulanıyor…' : 'Zincir bütünlüğünü doğrula'}
        </button>
      }
    >
      {verifyResult && (
        <section
          className={cn(
            'mb-5 flex flex-wrap items-start gap-3 rounded-2xl border p-4',
            verifyResult.verified
              ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
              : 'border-rose-500/30 bg-rose-500/[0.06]',
          )}
          data-testid="audit-verify-result"
        >
          {verifyResult.verified ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 flex-none text-rose-600 dark:text-rose-400" />
          )}
          <div className="flex-1 text-[13px] leading-relaxed">
            <strong className="font-medium text-foreground">
              {verifyResult.verified
                ? 'Bütünlük korunmuş'
                : `${verifyResult.brokenLinks.length} adet broken link tespit edildi`}
            </strong>
            <div className="mt-0.5 text-foreground/70">
              {verifyResult.totalEvents} event tarandı
              {!verifyResult.verified && verifyResult.brokenLinks.length > 0 && (
                <>
                  {' '}
                  · bozuk:{' '}
                  <code className="font-mono text-[11px]">
                    {verifyResult.brokenLinks.join(', ')}
                  </code>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVerifyResult(null)}
            aria-label="Sonucu kapat"
            className="rounded-lg border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-foreground/[0.04]"
          >
            Kapat
          </button>
        </section>
      )}

      {/* Filter bar */}
      <section className="mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-5">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Actor
          </span>
          <select
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] outline-none [&>option]:bg-background"
          >
            <option value="">Tümü</option>
            {actors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Action
          </span>
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="user.login"
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-[12px] outline-none transition focus:border-foreground/30"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Resource
          </span>
          <input
            type="text"
            value={resourcePrefix}
            onChange={(e) => setResourcePrefix(e.target.value)}
            placeholder="listing"
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-[12px] outline-none transition focus:border-foreground/30"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Başlangıç
          </span>
          <input
            type="date"
            value={from}
            max={todayISO(0)}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Bitiş
          </span>
          <input
            type="date"
            value={to}
            max={todayISO(0)}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] outline-none"
          />
        </label>
        <div className="col-span-2 flex items-end justify-end md:col-span-5">
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground"
          >
            Filtreleri temizle
          </button>
        </div>
      </section>

      {/* Liste */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="w-8 px-2 py-2.5"></th>
                <th className="px-3 py-2.5">ID</th>
                <th className="px-3 py-2.5">Zaman</th>
                <th className="px-3 py-2.5">Actor</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">Resource</th>
                <th className="px-3 py-2.5">Hash</th>
              </tr>
            </thead>
            <tbody>
              {isPending && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Yükleniyor…
                  </td>
                </tr>
              )}
              {filtered.map((ev) => {
                const isOpen = expanded[ev.id] ?? false
                return (
                  <Fragment key={ev.id}>
                    <tr
                      className="cursor-pointer border-b border-border/60 transition hover:bg-foreground/[0.02] last:border-0"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [ev.id]: !isOpen }))
                      }
                    >
                      <td className="px-2 py-2.5 align-top">
                        <ChevronRight
                          className={cn(
                            'h-3 w-3 text-muted-foreground transition-transform',
                            isOpen && 'rotate-90',
                          )}
                        />
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono text-[11px] text-muted-foreground">
                        {ev.id}
                      </td>
                      <td
                        className="px-3 py-2.5 align-top font-mono text-[11px] text-muted-foreground"
                        title={ev.at}
                      >
                        {formatAbs(ev.at)}
                      </td>
                      <td className="px-3 py-2.5 align-top text-[13px]">{ev.actor}</td>
                      <td className="px-3 py-2.5 align-top">
                        <code className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[11px]">
                          {ev.action}
                        </code>
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono text-[11px] text-foreground/80">
                        {ev.resource}
                      </td>
                      <td
                        className="px-3 py-2.5 align-top font-mono text-[11px] text-muted-foreground"
                        title={ev.hash}
                      >
                        {shortHash(ev.hash)}…
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border/60 bg-muted/20">
                        <td></td>
                        <td colSpan={6} className="px-4 py-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                Hash
                              </div>
                              <code className="block break-all font-mono text-[11px] text-foreground/80">
                                {ev.hash}
                              </code>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                Prev hash
                              </div>
                              <code className="block break-all font-mono text-[11px] text-foreground/80">
                                {ev.prevHash}
                              </code>
                            </div>
                          </div>
                          {ev.meta && Object.keys(ev.meta).length > 0 && (
                            <div className="mt-3">
                              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                Meta
                              </div>
                              <pre className="mt-1 overflow-x-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] text-foreground/80">
                                <code>{JSON.stringify(ev.meta, null, 2)}</code>
                              </pre>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {!isPending && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Eşleşen audit kaydı yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
