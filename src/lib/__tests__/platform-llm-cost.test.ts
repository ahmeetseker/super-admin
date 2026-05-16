// Wave F12.A — platform-llm-cost.ts unit tests.
import { beforeEach, describe, expect, it } from 'vitest'
import { TENANTS } from '@landx/data'
import {
  MODELS,
  computeLlmKpis,
  getLlmCostEntries,
  resetLlmCostForTests,
  seedLlmCostEntries,
  summarizeByModel,
  summarizeByTenant,
} from '@/lib/platform-llm-cost'

beforeEach(() => {
  resetLlmCostForTests()
})

describe('platform-llm-cost — seed', () => {
  it('seeds 200 deterministic entries', () => {
    const entries = getLlmCostEntries()
    expect(entries).toHaveLength(200)
    // Determinism: a second call yields identical ids in the same order.
    resetLlmCostForTests()
    const again = seedLlmCostEntries()
    expect(again.map((e) => e.id)).toEqual(entries.map((e) => e.id))
    expect(again.map((e) => e.costTL)).toEqual(entries.map((e) => e.costTL))
  })

  it('all entries fall within the last 90 days', () => {
    const entries = getLlmCostEntries()
    const ninetyDays = 90 * 24 * 60 * 60 * 1000
    const newest = Math.max(...entries.map((e) => e.timestamp))
    for (const e of entries) {
      expect(newest - e.timestamp).toBeLessThanOrEqual(ninetyDays)
      expect(e.timestamp).toBeLessThanOrEqual(newest)
    }
  })

  it('uses exactly the 3 LLM models and bounded token counts', () => {
    const entries = getLlmCostEntries()
    const seen = new Set(entries.map((e) => e.model))
    for (const m of MODELS) expect(seen.has(m)).toBe(true)
    for (const e of entries) {
      expect(MODELS).toContain(e.model)
      expect(e.promptTokens).toBeGreaterThanOrEqual(200)
      expect(e.promptTokens).toBeLessThanOrEqual(4000)
      expect(e.completionTokens).toBeGreaterThanOrEqual(100)
      expect(e.completionTokens).toBeLessThanOrEqual(2000)
      expect(e.costTL).toBeGreaterThan(0)
    }
  })

  it('tenantIds reference the shared TENANTS list', () => {
    const tenantIds = new Set(TENANTS.map((t) => t.id))
    for (const e of getLlmCostEntries()) {
      expect(tenantIds.has(e.tenantId)).toBe(true)
    }
  })
})

describe('platform-llm-cost — aggregations', () => {
  it('computeLlmKpis returns zeros on empty input', () => {
    const k = computeLlmKpis([])
    expect(k).toEqual({ totalCostTL: 0, totalCalls: 0, avgCostPerCallTL: 0, topModel: null })
  })

  it('computeLlmKpis totals match seed', () => {
    const entries = getLlmCostEntries()
    const k = computeLlmKpis(entries)
    expect(k.totalCalls).toBe(200)
    expect(k.totalCostTL).toBeGreaterThan(0)
    expect(k.avgCostPerCallTL).toBeGreaterThan(0)
    expect(MODELS).toContain(k.topModel!)
  })

  it('summarizeByModel covers every model used and sorts by cost desc', () => {
    const rows = summarizeByModel(getLlmCostEntries())
    expect(rows.length).toBeGreaterThan(0)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].totalCostTL).toBeGreaterThanOrEqual(rows[i].totalCostTL)
    }
    const totalCalls = rows.reduce((s, r) => s + r.callCount, 0)
    expect(totalCalls).toBe(200)
  })

  it('summarizeByTenant sums correctly', () => {
    const rows = summarizeByTenant(getLlmCostEntries())
    const totalCalls = rows.reduce((s, r) => s + r.callCount, 0)
    expect(totalCalls).toBe(200)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].totalCostTL).toBeGreaterThanOrEqual(rows[i].totalCostTL)
    }
  })
})
