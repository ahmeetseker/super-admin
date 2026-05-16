import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Building2, ExternalLink, Search } from '@landx/icons'
import { PageShell, cn, formatTL, formatTLCompact, SkeletonTable } from '@landx/ui'
import { useTenants, type Tenant } from '@landx/data'
import { BulkActionsBar } from '@/components/tenants/BulkActionsBar'

// Lazy-loaded modals (keep super-admin main bundle under cap).
const SuspendModal = lazy(() =>
  import('@/components/tenant/SuspendModal').then((m) => ({ default: m.SuspendModal })),
)
const PlanChangeModal = lazy(() =>
  import('@/components/plan-change/PlanChangeModal').then((m) => ({
    default: m.PlanChangeModal,
  })),
)

const STATUS_TONE: Record<Tenant['status'], string> = {
  Aktif: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-400/10',
  Trial: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-400/10',
  Askıda: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-400/10',
  Churned: 'text-stone-600 dark:text-stone-400 bg-stone-500/10 dark:bg-stone-400/10',
}

const PLAN_TONE: Record<Tenant['plan'], string> = {
  Free: 'bg-foreground/5 text-foreground/70',
  Pro: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  Enterprise: 'bg-foreground text-background',
}

export function Tenants() {
  const [q, setQ] = useState('')
  const [planFilter, setPlanFilter] = useState<'Tümü' | Tenant['plan']>('Tümü')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkSuspendOpen, setBulkSuspendOpen] = useState(false)
  const [bulkPlanOpen, setBulkPlanOpen] = useState(false)
  const [tagFlash, setTagFlash] = useState<string | null>(null)

  // Single unfiltered fetch — the dataset is small (<100 tenants by design),
  // so filtering client-side keeps the chip counts honest and avoids a
  // refetch flash on every chip click.
  const { data: tenants = [], isPending: tenantsPending } = useTenants({})
  const showSkeleton = tenantsPending && tenants.length === 0

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      if (planFilter !== 'Tümü' && t.plan !== planFilter) return false
      if (q) {
        const blob = `${t.id} ${t.name} ${t.city}`.toLocaleLowerCase('tr-TR')
        if (!blob.includes(q.toLocaleLowerCase('tr-TR'))) return false
      }
      return true
    })
  }, [q, planFilter, tenants])

  const activeCount = tenants.filter((t) => t.status === 'Aktif').length
  const trialCount = tenants.filter((t) => t.status === 'Trial').length
  const totalMrr = tenants.reduce((s, t) => s + t.mrr, 0)
  const totalListings = tenants.reduce((s, t) => s + t.listingCount, 0)

  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id))
  const partiallySelected =
    !allFilteredSelected && filtered.some((t) => selectedIds.has(t.id))

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filtered.forEach((t) => next.delete(t.id))
      } else {
        filtered.forEach((t) => next.add(t.id))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const selectedTenants = useMemo(
    () => tenants.filter((t) => selectedIds.has(t.id)),
    [tenants, selectedIds],
  )

  const bulkActions = [
    {
      id: 'plan-change',
      label: 'Toplu plan değiştir',
      onClick: () => setBulkPlanOpen(true),
    },
    {
      id: 'tag',
      label: 'Etiket ekle',
      onClick: () => {
        const tag = window.prompt(`${selectedIds.size} tenant için etiket adı:`)
        if (tag && tag.trim().length > 0) {
          // No persistent tag store yet — surface a transient confirmation only.
          setTagFlash(`${selectedIds.size} tenant '${tag.trim()}' etiketi ile işaretlendi (mock).`)
          window.setTimeout(() => setTagFlash(null), 4000)
        }
      },
    },
    {
      id: 'suspend',
      label: 'Toplu askıya al',
      tone: 'destructive' as const,
      onClick: () => setBulkSuspendOpen(true),
    },
  ]

  return (
    <PageShell
      eyebrow="MOD · TENANTS"
      title={
        <>
          Emlak <em className="font-serif italic font-light">ofisleri</em>
        </>
      }
      description={`${tenants.length} kayıtlı tenant · ${activeCount} aktif · ${trialCount} trial · ${formatTLCompact(totalMrr)} MRR.`}
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Toplam tenant" value={String(tenants.length)} hint={`${activeCount} aktif`} />
        <Stat label="Aylık ciro (MRR)" value={formatTLCompact(totalMrr)} hint={`${trialCount} trial dahil değil`} />
        <Stat label="Trial → Pro fırsatı" value={String(trialCount)} hint="bu ay biten 14-gün trial" />
        <Stat label="Toplam ilan" value={String(totalListings)} hint="platformda" />
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <label className="sr-only" htmlFor="tenant-search">
            Tenant ara
          </label>
          <input
            id="tenant-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ofis adı, şehir, ID…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            {(['Tümü', 'Free', 'Pro', 'Enterprise'] as const).map((p) => {
              const count = p === 'Tümü' ? tenants.length : tenants.filter((t) => t.plan === p).length
              const active = planFilter === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlanFilter(p)}
                  className={cn(
                    'inline-flex flex-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                    active ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p}
                  <span
                    className={cn(
                      'rounded-full px-1.5 font-mono text-[10px] tabular-nums',
                      active ? 'bg-background/20' : 'bg-foreground/[0.06]',
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {tagFlash && (
        <div
          role="status"
          data-testid="tenants-tag-flash"
          className="mb-3 rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] text-muted-foreground"
        >
          {tagFlash}
        </div>
      )}

      <BulkActionsBar
        count={selectedIds.size}
        onClear={clearSelection}
        actions={bulkActions}
      />

      {showSkeleton ? (
        <div
          data-testid="tenants-skeleton"
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <SkeletonTable rows={8} cells={6} />
        </div>
      ) : (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="w-10 px-3 py-2.5">
                  <label className="sr-only" htmlFor="tenants-select-all">
                    Tümünü seç
                  </label>
                  <input
                    id="tenants-select-all"
                    type="checkbox"
                    data-testid="tenants-select-all"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = partiallySelected
                    }}
                    onChange={toggleAllFiltered}
                    aria-label="Filtrelenen tüm tenant'ları seç"
                    className="h-3.5 w-3.5 accent-foreground"
                  />
                </th>
                <th className="px-4 py-2.5">Tenant</th>
                <th className="px-4 py-2.5">Plan</th>
                <th className="px-4 py-2.5 text-right">MRR</th>
                <th className="px-4 py-2.5 text-right">İlan</th>
                <th className="px-4 py-2.5 text-right">Kullanıcı</th>
                <th className="px-4 py-2.5">Durum</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-3">
                    <label className="sr-only" htmlFor={`tenant-select-${t.id}`}>
                      {t.name} seç
                    </label>
                    <input
                      id={`tenant-select-${t.id}`}
                      type="checkbox"
                      data-testid={`tenant-select-${t.id}`}
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleOne(t.id)}
                      className="h-3.5 w-3.5 accent-foreground"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-foreground/[0.08]"
                      >
                        <Building2 className="h-4 w-4 text-foreground/70" />
                      </span>
                      <div>
                        <div className="text-[14px] font-medium leading-tight">{t.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {t.id} · {t.city}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px]', PLAN_TONE[t.plan])}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-serif tabular-nums">
                    {t.mrr > 0 ? formatTL(t.mrr) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{t.listingCount}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{t.userCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATUS_TONE[t.status],
                      )}
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/tenants/${t.id}`}
                      aria-label={`${t.name} ofisinin detayını aç`}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Aç
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Eşleşen tenant bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Wave F13.B — bulk suspend (type-to-confirm, multi-id). */}
      {bulkSuspendOpen && (
        <Suspense fallback={null}>
          <SuspendModal
            tenantIds={Array.from(selectedIds)}
            tenantLabel={selectedTenants[0]?.name}
            onClose={() => setBulkSuspendOpen(false)}
            onSuspended={() => {
              setBulkSuspendOpen(false)
              clearSelection()
            }}
          />
        </Suspense>
      )}

      {/* Wave F13.B — bulk plan change (UI-only mock; uses first tenant's plan as anchor). */}
      {bulkPlanOpen && selectedTenants[0] && (
        <Suspense fallback={null}>
          <PlanChangeModal
            currentPlanName={selectedTenants[0].plan}
            cycleStartISO="2026-05-01T00:00:00Z"
            todayISO={new Date().toISOString()}
            onClose={() => setBulkPlanOpen(false)}
            onConfirm={() => {
              setBulkPlanOpen(false)
              clearSelection()
            }}
          />
        </Suspense>
      )}
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
