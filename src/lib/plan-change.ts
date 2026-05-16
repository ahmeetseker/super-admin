// Pure proration math for the "Planı değiştir" flow (Faz 11.9).
// No React. No DOM. Deterministic. All times are interpreted in UTC so that
// a Date constructed from an ISO string and one constructed from local pieces
// agree across timezones during tests.

import type { PlanTierId } from '@landx/data'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface ProratePlanChangeInput {
  fromPlan: PlanTierId
  toPlan: PlanTierId
  /** ISO string for the start of the current billing cycle. */
  cycleStartISO: string
  /** Today; ISO string. Must be >= cycleStartISO. */
  today: string
  /** monthlyPriceTL(toPlan) - monthlyPriceTL(fromPlan). Positive = upgrade. */
  monthlyDifference: number
  /** Billing cycle length in days. Defaults to 30. */
  cycleDays?: number
}

export interface ProratePlanChangeResult {
  /** Days remaining in the current billing cycle (>= 0, <= cycleDays). */
  days: number
  /** Prorated amount in TL. Positive = charge tenant; negative = credit. */
  amount: number
}

/**
 * Compute the prorated charge (or credit) for switching plans mid-cycle.
 *
 *   amount = monthlyDifference * (daysRemaining / cycleDays)
 *
 * Rules:
 *   - Same plan (fromPlan === toPlan): returns { days: <remaining>, amount: 0 }.
 *   - cycleStart in the future or today === cycleStart: full month delta charged.
 *   - cycle already complete (today >= cycleStart + cycleDays): 0 days remaining → amount 0.
 *   - amount rounded to nearest integer TL.
 */
export function proratePlanChange({
  fromPlan,
  toPlan,
  cycleStartISO,
  today,
  monthlyDifference,
  cycleDays = 30,
}: ProratePlanChangeInput): ProratePlanChangeResult {
  const start = Date.parse(cycleStartISO)
  const now = Date.parse(today)
  if (Number.isNaN(start) || Number.isNaN(now)) {
    return { days: 0, amount: 0 }
  }

  const elapsedDays = Math.max(0, Math.floor((now - start) / MS_PER_DAY))
  const daysRemaining = Math.max(0, Math.min(cycleDays, cycleDays - elapsedDays))

  if (fromPlan === toPlan) {
    return { days: daysRemaining, amount: 0 }
  }

  const ratio = daysRemaining / cycleDays
  const raw = monthlyDifference * ratio
  // Round half away from zero so credits and charges symmetric.
  const amount = raw >= 0 ? Math.round(raw) : -Math.round(-raw)
  return { days: daysRemaining, amount }
}

/** Format a positive proration line; consumers handle the sign label. */
export function formatProrationHint(result: ProratePlanChangeResult): string {
  if (result.amount === 0) {
    return `Bu fatura döngüsünde kalan ${result.days} gün için ek ücret yok.`
  }
  if (result.amount > 0) {
    return `Bu fatura döngüsünde kalan ${result.days} gün için ₺${result.amount.toLocaleString('tr-TR')} eklenecek.`
  }
  return `Bu fatura döngüsünde kalan ${result.days} gün için ₺${Math.abs(result.amount).toLocaleString('tr-TR')} iade/kontör olarak işlenecek.`
}
