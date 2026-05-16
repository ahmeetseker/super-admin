import { describe, expect, it } from 'vitest'
import {
  createPresetRange,
  createCustomRange,
  inRange,
  rangeDurationMs,
  formatRangeLabel,
  timeBuckets,
  groupByBucket,
  PRESET_OPTIONS,
} from '../super-admin-time-range'

const NOW = 1_700_000_000_000

describe('super-admin-time-range', () => {
  it('createPresetRange 24h', () => {
    const r = createPresetRange('24h', NOW)
    expect(r.preset).toBe('24h')
    expect(r.endMs - r.startMs).toBe(24 * 60 * 60 * 1000)
    expect(r.endMs).toBe(NOW)
  })

  it('createPresetRange 90d', () => {
    const r = createPresetRange('90d', NOW)
    expect(r.endMs - r.startMs).toBe(90 * 24 * 60 * 60 * 1000)
  })

  it('createCustomRange swaps if start>end', () => {
    const r = createCustomRange(NOW, NOW - 1000)
    expect(r.startMs).toBeLessThan(r.endMs)
  })

  it('inRange', () => {
    const r = createPresetRange('7d', NOW)
    expect(inRange(NOW - 1000, r)).toBe(true)
    expect(inRange(NOW + 1000, r)).toBe(false)
    expect(inRange(r.startMs - 1, r)).toBe(false)
  })

  it('rangeDurationMs', () => {
    const r = createPresetRange('30d', NOW)
    expect(rangeDurationMs(r)).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it('formatRangeLabel preset', () => {
    expect(formatRangeLabel(createPresetRange('7d', NOW))).toBe('Son 7 gün')
  })

  it('formatRangeLabel custom', () => {
    const r = createCustomRange(NOW - 100_000_000, NOW)
    const label = formatRangeLabel(r)
    expect(label).toContain('–')
  })

  it('timeBuckets returns N+1 boundaries', () => {
    const r = createPresetRange('24h', NOW)
    const buckets = timeBuckets(r, 12)
    expect(buckets.length).toBe(13)
    expect(buckets[0]).toBe(r.startMs)
    expect(buckets[12]).toBe(r.endMs)
  })

  it('groupByBucket distributes evenly', () => {
    const r = createPresetRange('24h', NOW)
    const entries = Array.from({ length: 24 }, (_, i) => ({ ts: r.startMs + i * 60 * 60 * 1000 + 1, val: i }))
    const groups = groupByBucket(entries, (e) => e.ts, r, 24)
    expect(groups.length).toBe(24)
    expect(groups.every((g) => g.length === 1)).toBe(true)
  })

  it('groupByBucket excludes out-of-range', () => {
    const r = createPresetRange('24h', NOW)
    const entries = [{ ts: r.startMs - 1, val: -1 }, { ts: r.endMs + 1, val: 99 }, { ts: r.startMs + 1, val: 0 }]
    const groups = groupByBucket(entries, (e) => e.ts, r, 4)
    expect(groups.flat().length).toBe(1)
  })

  it('PRESET_OPTIONS includes 5 presets', () => {
    expect(PRESET_OPTIONS.length).toBe(5)
    expect(PRESET_OPTIONS).toContain('custom')
  })
})
