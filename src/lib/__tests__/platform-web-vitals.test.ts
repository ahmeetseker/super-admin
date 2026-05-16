// Wave F12.B — Tests for lib/platform-web-vitals.ts.
// Covers seed determinism, percentile/status helpers, filter, summarize,
// alerts, bucketing and the localStorage CRUD round-trip.
// F13.E: in-memory localStorage shim moved to apps/super-admin/vitest.setup.ts.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  getEntries,
  filterEntries,
  summarizeMetric,
  summarizeAll,
  getAlerts,
  bucketSeries,
  getPercentile,
  getStatus,
  getDistinctPages,
  buildSeedEntries,
  THRESHOLDS,
  METRICS,
  __resetPlatformWebVitalsForTests,
  __STORAGE_KEY,
  __SEED_COUNT,
  __SEED_END_MS,
  __SEED_START_MS,
} from '@/lib/platform-web-vitals'

describe('platform-web-vitals', () => {
  beforeEach(() => {
    __resetPlatformWebVitalsForTests()
  })

  it('seeds 500 deterministic entries spanning 30 days on first read', () => {
    const entries = getEntries()
    expect(entries).toHaveLength(__SEED_COUNT)
    for (const e of entries) {
      expect(e.timestamp).toBeGreaterThanOrEqual(__SEED_START_MS - 1)
      expect(e.timestamp).toBeLessThanOrEqual(__SEED_END_MS + 1)
      expect(METRICS).toContain(e.metric)
    }
    // Deterministic: identical seed → identical output.
    __resetPlatformWebVitalsForTests()
    window.localStorage.removeItem(__STORAGE_KEY)
    const again = getEntries()
    expect(again[0]).toEqual(entries[0])
    expect(again[__SEED_COUNT - 1]).toEqual(entries[__SEED_COUNT - 1])
  })

  it('persists seed to localStorage on first read', () => {
    getEntries()
    const raw = window.localStorage.getItem(__STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!) as unknown[]
    expect(parsed.length).toBe(__SEED_COUNT)
  })

  it('getPercentile sorts before index lookup', () => {
    expect(getPercentile([], 0.5)).toBe(0)
    expect(getPercentile([10, 5, 1, 7, 3], 0.5)).toBe(5)
    expect(getPercentile([10, 5, 1, 7, 3], 0.95)).toBe(10)
    expect(getPercentile([10, 5, 1, 7, 3], 0)).toBe(1)
    // Out-of-range p is clamped.
    expect(getPercentile([1, 2, 3, 4], 5)).toBe(4)
    expect(getPercentile([1, 2, 3, 4], -1)).toBe(1)
  })

  it('getStatus maps to green/amber/red per Core Web Vitals thresholds', () => {
    // LCP < 2500 = green, < 4000 = amber, else red
    expect(getStatus('LCP', 1200)).toBe('green')
    expect(getStatus('LCP', 2499.99)).toBe('green')
    expect(getStatus('LCP', 2500)).toBe('amber')
    expect(getStatus('LCP', 3999)).toBe('amber')
    expect(getStatus('LCP', 4000)).toBe('red')
    expect(getStatus('LCP', 8000)).toBe('red')
    // INP
    expect(getStatus('INP', 100)).toBe('green')
    expect(getStatus('INP', 400)).toBe('amber')
    expect(getStatus('INP', 700)).toBe('red')
    // CLS — score, not ms
    expect(getStatus('CLS', 0.05)).toBe('green')
    expect(getStatus('CLS', 0.2)).toBe('amber')
    expect(getStatus('CLS', 0.3)).toBe('red')
    // FCP
    expect(getStatus('FCP', 1500)).toBe('green')
    expect(getStatus('FCP', 2500)).toBe('amber')
    expect(getStatus('FCP', 3500)).toBe('red')
    // TTFB
    expect(getStatus('TTFB', 500)).toBe('green')
    expect(getStatus('TTFB', 1000)).toBe('amber')
    expect(getStatus('TTFB', 2000)).toBe('red')
  })

  it('THRESHOLDS expose Google CWV constants for all 5 metrics', () => {
    expect(THRESHOLDS.LCP.greenMax).toBe(2500)
    expect(THRESHOLDS.INP.greenMax).toBe(200)
    expect(THRESHOLDS.CLS.greenMax).toBeCloseTo(0.1)
    expect(THRESHOLDS.FCP.greenMax).toBe(1800)
    expect(THRESHOLDS.TTFB.greenMax).toBe(800)
  })

  it('filterEntries narrows by metric / device / browser / page / time', () => {
    const entries = getEntries()
    const justInp = filterEntries(entries, { metric: 'INP' })
    expect(justInp.every((e) => e.metric === 'INP')).toBe(true)
    expect(justInp.length).toBeGreaterThan(0)

    const justMobile = filterEntries(entries, { device: 'mobile' })
    expect(justMobile.every((e) => e.device === 'mobile')).toBe(true)

    const chrome = filterEntries(entries, { browser: 'chrome' })
    expect(chrome.every((e) => e.browser === 'chrome')).toBe(true)

    const root = filterEntries(entries, { page: '/' })
    expect(root.every((e) => e.page === '/')).toBe(true)

    const tail = filterEntries(entries, { startMs: __SEED_END_MS - 24 * 60 * 60 * 1000 })
    expect(tail.length).toBeLessThan(entries.length)
    expect(tail.every((e) => e.timestamp >= __SEED_END_MS - 24 * 60 * 60 * 1000)).toBe(true)
  })

  it('summarizeMetric returns p50/p75/p95 + status for the metric', () => {
    const entries = getEntries()
    const summary = summarizeMetric(entries, 'LCP')
    expect(summary.metric).toBe('LCP')
    expect(summary.count).toBeGreaterThan(0)
    expect(summary.p50).toBeLessThanOrEqual(summary.p75)
    expect(summary.p75).toBeLessThanOrEqual(summary.p95)
    expect(['green', 'amber', 'red']).toContain(summary.status)
  })

  it('summarizeAll covers all 5 metrics', () => {
    const summaries = summarizeAll(getEntries())
    expect(summaries.map((s) => s.metric).sort()).toEqual([...METRICS].sort())
  })

  it('getAlerts only returns red-status entries sorted by exceedance', () => {
    const entries = getEntries()
    const alerts = getAlerts(entries, 50)
    expect(alerts.length).toBeGreaterThan(0)
    for (const a of alerts) {
      const t = THRESHOLDS[a.entry.metric]
      expect(a.entry.value).toBeGreaterThanOrEqual(t.amberMax)
      expect(a.exceedBy).toBeGreaterThanOrEqual(0)
    }
    // Sorted descending by exceedBy.
    for (let i = 1; i < alerts.length; i++) {
      expect(alerts[i - 1].exceedBy).toBeGreaterThanOrEqual(alerts[i].exceedBy)
    }
  })

  it('bucketSeries produces N points with monotonic bucket boundaries', () => {
    const entries = getEntries()
    const buckets: number[] = []
    for (let i = 0; i <= 24; i++) {
      buckets.push(__SEED_START_MS + ((__SEED_END_MS - __SEED_START_MS) * i) / 24)
    }
    const series = bucketSeries(entries, 'LCP', buckets)
    expect(series.metric).toBe('LCP')
    expect(series.points.length).toBe(24)
    // Each populated point has p50 <= p75 <= p95.
    for (const pt of series.points) {
      if (pt.count > 0) {
        expect(pt.p50).toBeLessThanOrEqual(pt.p75)
        expect(pt.p75).toBeLessThanOrEqual(pt.p95)
      }
    }
  })

  it('getDistinctPages returns sorted unique page paths', () => {
    const pages = getDistinctPages(getEntries())
    expect(pages.length).toBeGreaterThan(1)
    const sorted = [...pages].sort()
    expect(pages).toEqual(sorted)
  })

  it('round-trips through localStorage when a payload is pre-seeded', () => {
    const seed = buildSeedEntries().slice(0, 3)
    window.localStorage.setItem(__STORAGE_KEY, JSON.stringify(seed))
    __resetPlatformWebVitalsForTests()
    const loaded = getEntries()
    expect(loaded.length).toBe(3)
    expect(loaded[0]).toEqual(seed[0])
  })

  it('falls back to seed when localStorage payload is malformed', () => {
    window.localStorage.setItem(__STORAGE_KEY, '{"not":"array"}')
    __resetPlatformWebVitalsForTests()
    const loaded = getEntries()
    expect(loaded.length).toBe(__SEED_COUNT)
  })
})
