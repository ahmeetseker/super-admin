import { describe, expect, it, beforeEach } from 'vitest'
import {
  getMemoryEntries,
  resetMemoryForTests,
  filterEntries,
  computeStats,
  AGENT_POOL,
  type MemoryEntry,
} from '../platform-memory'
import { createPresetRange } from '../super-admin-time-range'

describe('platform-memory', () => {
  beforeEach(() => {
    resetMemoryForTests()
  })

  it('seeds exactly 250 entries', () => {
    const entries = getMemoryEntries()
    expect(entries.length).toBe(250)
  })

  it('seed is deterministic — repeated calls return identical data', () => {
    const a = getMemoryEntries().slice(0, 5).map((e) => e.id + e.content + e.accessCount)
    resetMemoryForTests()
    const b = getMemoryEntries().slice(0, 5).map((e) => e.id + e.content + e.accessCount)
    expect(a).toEqual(b)
  })

  it('all 8 agents are used in the seed', () => {
    const entries = getMemoryEntries()
    const seenAgents = new Set(entries.map((e) => e.agentId))
    expect(seenAgents.size).toBe(AGENT_POOL.length)
    for (const a of AGENT_POOL) expect(seenAgents.has(a)).toBe(true)
  })

  it('all three types appear', () => {
    const entries = getMemoryEntries()
    const types = new Set(entries.map((e) => e.type))
    expect(types.has('long-term')).toBe(true)
    expect(types.has('working')).toBe(true)
    expect(types.has('episodic')).toBe(true)
  })

  it('all three scopes appear', () => {
    const entries = getMemoryEntries()
    const scopes = new Set(entries.map((e) => e.scope))
    expect(scopes.has('tenant')).toBe(true)
    expect(scopes.has('agent')).toBe(true)
    expect(scopes.has('global')).toBe(true)
  })

  it('global scope entries have null tenantId', () => {
    const entries = getMemoryEntries()
    const globals = entries.filter((e) => e.scope === 'global')
    expect(globals.length).toBeGreaterThan(0)
    expect(globals.every((e) => e.tenantId === null)).toBe(true)
  })

  it('accessCount ∈ [0, 100)', () => {
    const entries = getMemoryEntries()
    for (const e of entries) {
      expect(e.accessCount).toBeGreaterThanOrEqual(0)
      expect(e.accessCount).toBeLessThan(100)
    }
  })

  it('ageDays ∈ [0, 90)', () => {
    const entries = getMemoryEntries()
    for (const e of entries) {
      expect(e.ageDays).toBeGreaterThanOrEqual(0)
      expect(e.ageDays).toBeLessThan(90)
    }
  })

  it('filterEntries filters by type', () => {
    const entries = getMemoryEntries()
    const filtered = filterEntries(entries, { type: 'long-term' })
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every((e) => e.type === 'long-term')).toBe(true)
  })

  it('filterEntries filters by scope', () => {
    const entries = getMemoryEntries()
    const filtered = filterEntries(entries, { scope: 'agent' })
    expect(filtered.every((e) => e.scope === 'agent')).toBe(true)
  })

  it('filterEntries filters by agentId', () => {
    const entries = getMemoryEntries()
    const filtered = filterEntries(entries, { agentId: 'atolye-assistant' })
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every((e) => e.agentId === 'atolye-assistant')).toBe(true)
  })

  it('filterEntries filters by time range', () => {
    const entries = getMemoryEntries()
    // 7d preset against seed epoch — only newest entries pass.
    const range = createPresetRange('7d', 1778630400000)
    const filtered = filterEntries(entries, { range })
    for (const e of filtered) {
      expect(e.createdAt).toBeGreaterThanOrEqual(range.startMs)
      expect(e.createdAt).toBeLessThanOrEqual(range.endMs)
    }
    expect(filtered.length).toBeLessThan(entries.length)
  })

  it('filterEntries with "all" sentinels does not filter', () => {
    const entries = getMemoryEntries()
    const filtered = filterEntries(entries, { type: 'all', scope: 'all', agentId: 'all' })
    expect(filtered.length).toBe(entries.length)
  })

  it('computeStats totals match entry count', () => {
    const entries = getMemoryEntries()
    const stats = computeStats(entries)
    expect(stats.totalEntries).toBe(250)
    const typeSum = stats.byType['long-term'] + stats.byType['working'] + stats.byType['episodic']
    expect(typeSum).toBe(250)
    const scopeSum = stats.byScope.tenant + stats.byScope.agent + stats.byScope.global
    expect(scopeSum).toBe(250)
  })

  it('computeStats hitRate ∈ [0, 1]', () => {
    const entries = getMemoryEntries()
    const stats = computeStats(entries)
    expect(stats.hitRate).toBeGreaterThanOrEqual(0)
    expect(stats.hitRate).toBeLessThanOrEqual(1)
  })

  it('computeStats handles empty input', () => {
    const stats = computeStats([])
    expect(stats.totalEntries).toBe(0)
    expect(stats.hitRate).toBe(0)
    expect(stats.avgAccessCount).toBe(0)
  })

  it('entries are sorted newest first', () => {
    const entries = getMemoryEntries()
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].createdAt).toBeGreaterThanOrEqual(entries[i].createdAt)
    }
  })

  it('content is non-empty for every entry', () => {
    const entries = getMemoryEntries()
    expect(entries.every((e: MemoryEntry) => e.content.length > 0)).toBe(true)
  })
})
