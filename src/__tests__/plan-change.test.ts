import { describe, expect, it } from 'vitest'
import { proratePlanChange, formatProrationHint } from '@/lib/plan-change'

describe('proratePlanChange', () => {
  it('same plan → amount 0, but days remaining reported', () => {
    const r = proratePlanChange({
      fromPlan: 'pro',
      toPlan: 'pro',
      cycleStartISO: '2026-05-01T00:00:00Z',
      today: '2026-05-12T00:00:00Z',
      monthlyDifference: 0,
    })
    expect(r.amount).toBe(0)
    // 30-day cycle, 11 days elapsed → 19 remaining
    expect(r.days).toBe(19)
  })

  it('upgrade mid-cycle → charges prorated delta', () => {
    // Free (0) → Pro (4900), 30-day cycle, 12 days elapsed → 18/30 remaining
    const r = proratePlanChange({
      fromPlan: 'free',
      toPlan: 'pro',
      cycleStartISO: '2026-04-30T00:00:00Z',
      today: '2026-05-12T00:00:00Z',
      monthlyDifference: 4900,
    })
    expect(r.days).toBe(18)
    expect(r.amount).toBe(Math.round(4900 * (18 / 30))) // 2940
  })

  it('downgrade mid-cycle → credit (negative amount)', () => {
    // Enterprise (14900) → Pro (4900), monthlyDifference = -10000
    // 30-day cycle, 6 days elapsed → 24/30 remaining
    const r = proratePlanChange({
      fromPlan: 'enterprise',
      toPlan: 'pro',
      cycleStartISO: '2026-05-06T00:00:00Z',
      today: '2026-05-12T00:00:00Z',
      monthlyDifference: -10000,
    })
    expect(r.days).toBe(24)
    expect(r.amount).toBe(-Math.round(10000 * (24 / 30))) // -8000
    expect(r.amount).toBeLessThan(0)
  })

  it('cycle just started (today === cycleStart) → full monthly delta', () => {
    const r = proratePlanChange({
      fromPlan: 'free',
      toPlan: 'starter',
      cycleStartISO: '2026-05-12T00:00:00Z',
      today: '2026-05-12T00:00:00Z',
      monthlyDifference: 1900,
    })
    expect(r.days).toBe(30)
    expect(r.amount).toBe(1900)
  })

  it('cycle already completed → 0 days remaining, no charge', () => {
    const r = proratePlanChange({
      fromPlan: 'free',
      toPlan: 'pro',
      cycleStartISO: '2026-03-01T00:00:00Z',
      today: '2026-05-12T00:00:00Z',
      monthlyDifference: 4900,
    })
    expect(r.days).toBe(0)
    expect(r.amount).toBe(0)
  })

  it('formatProrationHint produces TR-formatted copy with sign-correct wording', () => {
    expect(
      formatProrationHint({ days: 18, amount: 2940 }),
    ).toBe('Bu fatura döngüsünde kalan 18 gün için ₺2.940 eklenecek.')
    expect(
      formatProrationHint({ days: 24, amount: -8000 }),
    ).toBe(
      'Bu fatura döngüsünde kalan 24 gün için ₺8.000 iade/kontör olarak işlenecek.',
    )
    expect(
      formatProrationHint({ days: 19, amount: 0 }),
    ).toBe('Bu fatura döngüsünde kalan 19 gün için ek ücret yok.')
  })
})
