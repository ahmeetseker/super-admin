import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  getPlans,
  getTenantCountForPlan,
  reorderPlans,
  subscribePlans,
  type PlatformPlan,
} from '@/lib/platform-plans'
import { PlanCard } from '@/components/plans/PlanCard'
import { PlanFormDialog } from '@/components/plans/PlanFormDialog'
import { DeletePlanDialog } from '@/components/plans/DeletePlanDialog'

type StatusFilter = 'all' | 'active' | 'inactive'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Pasif' },
]

export function Plans() {
  const [plans, setPlans] = useState<PlatformPlan[]>(() => getPlans())
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  // undefined = closed, null = create, PlatformPlan = edit
  const [formPlan, setFormPlan] = useState<PlatformPlan | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<PlatformPlan | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Refresh on storage / change events.
  useEffect(() => {
    const refresh = () => setPlans(getPlans())
    refresh()
    return subscribePlans(refresh)
  }, [])

  const tenantCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const p of plans) out[p.id] = getTenantCountForPlan(p.id)
    return out
  }, [plans])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return plans.filter((p) => {
      if (statusFilter === 'active' && !p.isActive) return false
      if (statusFilter === 'inactive' && p.isActive) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.tier.toLowerCase().includes(q) ||
        p.features.some((f) => f.toLowerCase().includes(q))
      )
    })
  }, [plans, query, statusFilter])

  const totalActive = plans.filter((p) => p.isActive).length
  const totalTenants = useMemo(
    () => plans.reduce((s, p) => s + (tenantCounts[p.id] ?? 0), 0),
    [plans, tenantCounts],
  )

  const handleDragStart = useCallback((id: string) => {
    setDragId(id)
  }, [])

  const handleDragOver = useCallback((id: string) => {
    setDragOverId(id)
  }, [])

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!dragId || dragId === targetId) {
        setDragId(null)
        setDragOverId(null)
        return
      }
      // Reorder against full plans list (not filtered) to keep persistence stable.
      const ids = plans.map((p) => p.id)
      const fromIdx = ids.indexOf(dragId)
      const toIdx = ids.indexOf(targetId)
      if (fromIdx < 0 || toIdx < 0) {
        setDragId(null)
        setDragOverId(null)
        return
      }
      const next = ids.slice()
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, dragId)
      const reordered = reorderPlans(next)
      setPlans(reordered)
      setDragId(null)
      setDragOverId(null)
    },
    [dragId, plans],
  )

  return (
    <PageShell
      eyebrow="MOD · I02 · PLANS"
      title={
        <>
          Plan & <em className="font-serif italic font-light">fiyatlandırma</em>
        </>
      }
      description={`${plans.length} plan · ${totalActive} aktif · ${totalTenants} bağlı ofis. Sürükle-bırak ile sırala.`}
      actions={
        <button
          type="button"
          onClick={() => setFormPlan(null)}
          data-testid="create-plan-cta"
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Yeni plan oluştur
        </button>
      }
    >
      <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Plan adı / özellik ara"
            aria-label="Planlarda ara"
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div
          role="tablist"
          aria-label="Durum filtresi"
          className="inline-flex rounded-xl border border-border bg-card p-1"
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition',
                statusFilter === opt.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div
          data-testid="plans-empty"
          className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground"
        >
          {query ? `"${query}" ile eşleşen plan yok.` : 'Bu filtreyle eşleşen plan yok.'}
        </div>
      ) : (
        <section
          data-testid="plans-grid"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          onDragLeave={() => setDragOverId(null)}
        >
          {filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              tenantCount={tenantCounts[plan.id] ?? 0}
              onEdit={(p) => setFormPlan(p)}
              onDelete={(p) => setDeleteTarget(p)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={dragId === plan.id}
              isDragOver={dragOverId === plan.id && dragId !== plan.id}
            />
          ))}
        </section>
      )}

      <PlanFormDialog
        plan={formPlan}
        onClose={() => setFormPlan(undefined)}
        onSaved={() => setPlans(getPlans())}
      />
      <DeletePlanDialog
        plan={deleteTarget}
        tenantCount={deleteTarget ? (tenantCounts[deleteTarget.id] ?? 0) : 0}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => setPlans(getPlans())}
      />
    </PageShell>
  )
}
