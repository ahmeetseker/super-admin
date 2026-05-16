// 4-tier plan comparison grid for the "Planı değiştir" flow.
// Token-only styling (no sky/indigo/blue/teal). Extracted so the proration
// math + UI assembly can be tested separately from the modal chrome.

import { cn } from '@landx/ui'
import { PLAN_TIERS, type PlanTier, type PlanTierId } from '@landx/data'

interface PlanComparisonTableProps {
  /** Tenant's current plan id (highlighted as "Mevcut"). */
  currentPlanId: PlanTierId
  /** Plan the operator is about to switch to (highlighted as "Seçili"). */
  selectedPlanId: PlanTierId
  onSelect: (id: PlanTierId) => void
}

function fmtQuota(v: number | 'unlimited' | 'tümü'): string {
  if (v === 'unlimited') return 'Sınırsız'
  if (v === 'tümü') return 'Tümü'
  return v.toLocaleString('tr-TR')
}

function fmtPrice(tl: number): string {
  if (tl === 0) return 'Ücretsiz'
  return `₺${tl.toLocaleString('tr-TR')}/ay`
}

interface Row {
  label: string
  read: (p: PlanTier) => string
}

const ROWS: Row[] = [
  { label: 'İlan kotası', read: (p) => fmtQuota(p.listingQuota) },
  { label: 'Kullanıcı koltuğu', read: (p) => fmtQuota(p.userQuota) },
  { label: 'Modüller', read: (p) => fmtQuota(p.modules) },
  { label: 'Alt tenant', read: (p) => fmtQuota(p.subTenants) },
  { label: 'SLA', read: (p) => p.sla },
  { label: 'Destek', read: (p) => p.support },
]

export function PlanComparisonTable({
  currentPlanId,
  selectedPlanId,
  onSelect,
}: PlanComparisonTableProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Plan seçimi"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {PLAN_TIERS.map((plan) => {
        const isCurrent = plan.id === currentPlanId
        const isSelected = plan.id === selectedPlanId
        return (
          <button
            key={plan.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(plan.id)}
            className={cn(
              'flex flex-col rounded-2xl border bg-card p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40',
              isSelected
                ? 'border-foreground ring-2 ring-foreground/20'
                : 'border-border hover:bg-foreground/[0.03]',
            )}
          >
            <header className="mb-3 flex items-baseline justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {plan.id}
                </div>
                <h4 className="mt-0.5 font-serif text-xl font-light tracking-tight">
                  {plan.name}
                </h4>
              </div>
              <div className="flex flex-col items-end gap-1">
                {isCurrent && (
                  <span className="rounded-full border border-border bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/70">
                    Mevcut
                  </span>
                )}
                {plan.recommended && !isCurrent && (
                  <span className="rounded-full bg-foreground px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-background">
                    Önerilen
                  </span>
                )}
              </div>
            </header>

            <div className="mb-3 font-serif text-2xl font-light tabular-nums">
              {fmtPrice(plan.monthlyPriceTL)}
            </div>

            <dl className="space-y-1.5 text-[12px]">
              {ROWS.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-2"
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="text-right tabular-nums">{row.read(plan)}</dd>
                </div>
              ))}
            </dl>
          </button>
        )
      })}
    </div>
  )
}
