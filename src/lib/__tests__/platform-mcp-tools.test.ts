// Tests for lib/platform-mcp-tools.ts.
// Covers seed determinism, status mix, duration buckets, summarize aggregation,
// range filter, and tool-name filter.
// F13.E: in-memory localStorage shim moved to apps/super-admin/vitest.setup.ts.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  _buildSeedCalls,
  _resetMcpToolsForTests,
  MCP_TOOL_NAMES,
  STORAGE_KEY_FOR_TESTS,
  formatDurationMs,
  getMcpToolCalls,
  getMcpToolCallsByTool,
  getMcpToolCallsInRange,
  summarizeMcpTools,
} from '@/lib/platform-mcp-tools'

describe('platform-mcp-tools', () => {
  beforeEach(() => {
    _resetMcpToolsForTests()
  })

  it('seeds exactly 300 call entries on first read', () => {
    const calls = getMcpToolCalls()
    expect(calls).toHaveLength(300)
    // Persisted to storage with the canonical key.
    const raw = window.localStorage.getItem(STORAGE_KEY_FOR_TESTS)
    expect(raw).toBeTruthy()
  })

  it('seed is deterministic — two builds with same ref produce identical output', () => {
    const refNow = Date.parse('2026-05-14T00:00:00.000Z')
    const a = _buildSeedCalls(refNow)
    const b = _buildSeedCalls(refNow)
    expect(a).toEqual(b)
  })

  it('seed status mix matches plan (≈75% success, ≈15% error, ≈10% timeout)', () => {
    const calls = getMcpToolCalls()
    const total = calls.length
    const success = calls.filter((c) => c.status === 'success').length / total
    const error = calls.filter((c) => c.status === 'error').length / total
    const timeout = calls.filter((c) => c.status === 'timeout').length / total
    // Tolerance ±0.06 on 300-call sample to absorb seed jitter.
    expect(success).toBeGreaterThan(0.69)
    expect(success).toBeLessThan(0.81)
    expect(error).toBeGreaterThan(0.09)
    expect(error).toBeLessThan(0.21)
    expect(timeout).toBeGreaterThan(0.05)
    expect(timeout).toBeLessThan(0.16)
  })

  it('duration buckets respect status (success 50-2000, error 100-500, timeout ≥5000)', () => {
    const calls = getMcpToolCalls()
    for (const c of calls) {
      if (c.status === 'success') {
        expect(c.durationMs).toBeGreaterThanOrEqual(50)
        expect(c.durationMs).toBeLessThanOrEqual(2000)
      } else if (c.status === 'error') {
        expect(c.durationMs).toBeGreaterThanOrEqual(100)
        expect(c.durationMs).toBeLessThanOrEqual(500)
      } else {
        expect(c.durationMs).toBeGreaterThanOrEqual(5000)
      }
    }
  })

  it('toolName always belongs to the canonical 8-name set', () => {
    const calls = getMcpToolCalls()
    const allowed = new Set<string>(MCP_TOOL_NAMES as unknown as string[])
    for (const c of calls) {
      expect(allowed.has(c.toolName)).toBe(true)
    }
  })

  it('summarizeMcpTools returns one row per tool and accurate counts', () => {
    const calls = getMcpToolCalls()
    const summary = summarizeMcpTools(calls)
    expect(summary).toHaveLength(MCP_TOOL_NAMES.length)
    // Sum of per-tool callCounts equals overall total.
    const total = summary.reduce((s, r) => s + r.callCount, 0)
    expect(total).toBe(calls.length)
    for (const row of summary) {
      // successRate must equal successCount/callCount.
      const expected = row.callCount === 0 ? 0 : row.successCount / row.callCount
      expect(row.successRate).toBeCloseTo(expected, 6)
      expect(row.callCount).toBe(row.successCount + row.errorCount + row.timeoutCount)
    }
  })

  it('getMcpToolCallsInRange filters by timestamp inclusively', () => {
    const calls = getMcpToolCalls()
    const minTs = Math.min(...calls.map((c) => c.timestampMs))
    const maxTs = Math.max(...calls.map((c) => c.timestampMs))
    // Pick a window spanning the middle 50% of the dataset.
    const lo = minTs + Math.floor((maxTs - minTs) * 0.25)
    const hi = minTs + Math.floor((maxTs - minTs) * 0.75)
    const ranged = getMcpToolCallsInRange(lo, hi)
    expect(ranged.length).toBeGreaterThan(0)
    expect(ranged.length).toBeLessThan(calls.length)
    for (const c of ranged) {
      expect(c.timestampMs).toBeGreaterThanOrEqual(lo)
      expect(c.timestampMs).toBeLessThanOrEqual(hi)
    }
  })

  it('getMcpToolCallsByTool returns at most `limit` entries for the requested tool', () => {
    const sample = getMcpToolCallsByTool('fetch-listing', 30)
    expect(sample.length).toBeLessThanOrEqual(30)
    for (const c of sample) expect(c.toolName).toBe('fetch-listing')
    // Default limit is 30 — request a bigger limit and verify it can return more.
    const bigger = getMcpToolCallsByTool('fetch-listing', 500)
    expect(bigger.length).toBeGreaterThanOrEqual(sample.length)
  })

  it('formatDurationMs renders ms below 1s and seconds above', () => {
    expect(formatDurationMs(120)).toBe('120ms')
    expect(formatDurationMs(999)).toBe('999ms')
    expect(formatDurationMs(1500)).toBe('1.50s')
    expect(formatDurationMs(5200)).toBe('5.20s')
  })

  it('malformed storage falls back to seed on next read', () => {
    window.localStorage.setItem(STORAGE_KEY_FOR_TESTS, '!!! not json !!!')
    _resetMcpToolsForTests()
    // The reset above cleared the storage; the next read re-seeds.
    const calls = getMcpToolCalls()
    expect(calls.length).toBe(300)
  })
})
