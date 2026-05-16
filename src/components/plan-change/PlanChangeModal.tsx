// "Planı değiştir" modal — UI-only mock. No real mutation; the parent records
// a pending-change badge once "Onayla" fires. Lazy-loaded from tenant-detail
// to keep super-admin main bundle under the 72 KB budget.

import { useMemo, useState } from 'react'
import { X } from '@landx/icons'
import { PLAN_TIERS, planTierIdFromTenantName, type PlanTierId } from '@landx/data'
import {
  formatProrationHint,
  proratePlanChange,
} from '@/lib/plan-change'
import { PlanComparisonTable } from './PlanComparisonTable'

export interface PlanChangeModalProps {
  /** Tenant.plan as written on the entity ("Free"|"Pro"|"Enterprise"). */
  currentPlanName: string
  /** ISO date for the start of the current billing cycle (mock). */
  cycleStartISO: string
  /** ISO date for "today" — passed in so tests stay deterministic. */
  todayISO: string
  onClose: () => void
  /** Called on confirm with the new plan id. Caller handles pending-change UI. */
  onConfirm: (newPlanId: PlanTierId) => void
}

export function PlanChangeModal({
  currentPlanName,
  cycleStartISO,
  todayISO,
  onClose,
  onConfirm,
}: PlanChangeModalProps) {
  const currentPlanId = useMemo(
    () => planTierIdFromTenantName(currentPlanName),
    [currentPlanName],
  )
  const [selected, setSelected] = useState<PlanTierId>(currentPlanId)

  const monthlyDifference = useMemo(() => {
    const from = PLAN_TIERS.find((p) => p.id === currentPlanId)?.monthlyPriceTL ?? 0
    const to = PLAN_TIERS.find((p) => p.id === selected)?.monthlyPriceTL ?? 0
    return to - from
  }, [currentPlanId, selected])

  const proration = useMemo(
    () =>
      proratePlanChange({
        fromPlan: currentPlanId,
        toPlan: selected,
        cycleStartISO,
        today: todayISO,
        monthlyDifference,
      }),
    [currentPlanId, selected, cycleStartISO, todayISO, monthlyDifference],
  )

  const isSame = selected === currentPlanId
  const direction =
    monthlyDifference > 0
      ? 'Yükseltme'
      : monthlyDifference < 0
        ? 'Düşürme'
        : 'Aynı seviye'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plan değiştir"
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <section
        className="w-[min(960px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              ABONELİK · PLAN DEĞİŞİKLİĞİ
            </div>
            <h3 className="mt-1 font-serif text-2xl font-light tracking-tight">
              Planı <em className="font-serif italic font-light text-muted-foreground">değiştir</em>
            </h3>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Mevcut: <strong className="text-foreground">{currentPlanName}</strong>.
              Yeni plan değişikliği bir sonraki onay adımında uygulanır
              (mock — bu sürümde gerçek mutasyon yok).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <PlanComparisonTable
          currentPlanId={currentPlanId}
          selectedPlanId={selected}
          onSelect={setSelected}
        />

        <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              PRORASYON
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {direction}
            </div>
          </div>
          <p className="mt-1.5 text-[13px] text-foreground">
            {isSame
              ? 'Aynı plan — değişiklik yok.'
              : formatProrationHint(proration)}
          </p>
          {!isSame && (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Δ aylık: ₺{monthlyDifference.toLocaleString('tr-TR')} · cycle başlangıcı:{' '}
              {new Date(cycleStartISO).toLocaleDateString('tr-TR')}
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={isSame}
            onClick={() => onConfirm(selected)}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Onayla
          </button>
        </div>
      </section>
    </div>
  )
}

export default PlanChangeModal
