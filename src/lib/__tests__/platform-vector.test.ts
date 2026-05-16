import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  getCollections,
  getCollection,
  reindexCollection,
  resetVectorForTests,
  computeVectorStats,
  formatBytes,
  formatCompact,
} from '../platform-vector'

describe('platform-vector', () => {
  beforeEach(() => {
    resetVectorForTests()
  })

  it('seeds 6 collections', () => {
    const cols = getCollections()
    expect(cols.length).toBe(6)
  })

  it('collection ids match spec', () => {
    const cols = getCollections()
    const ids = cols.map((c) => c.id).sort()
    expect(ids).toEqual([
      'audits-logs',
      'helpdesk-faq',
      'listings-embedding',
      'listings-text',
      'products',
      'users',
    ])
  })

  it('vector counts match spec exactly', () => {
    const cols = getCollections()
    const byId = Object.fromEntries(cols.map((c) => [c.id, c.vectorCount]))
    expect(byId['listings-embedding']).toBe(50_000)
    expect(byId['listings-text']).toBe(100_000)
    expect(byId['users']).toBe(10_000)
    expect(byId['helpdesk-faq']).toBe(5_000)
    expect(byId['audits-logs']).toBe(200_000)
    expect(byId['products']).toBe(500_000)
  })

  it('indexSize = vectorCount * dimension * 4 (float32)', () => {
    const cols = getCollections()
    for (const c of cols) {
      expect(c.indexSize).toBe(c.vectorCount * c.dimension * 4)
    }
  })

  it('distance metric covers cosine and dot', () => {
    const cols = getCollections()
    const metrics = new Set(cols.map((c) => c.distanceMetric))
    expect(metrics.has('cosine')).toBe(true)
    expect(metrics.has('dot')).toBe(true)
  })

  it('getCollection returns matching collection', () => {
    const c = getCollection('users')
    expect(c).toBeDefined()
    expect(c?.dimension).toBe(1536)
  })

  it('getCollection returns undefined for unknown id', () => {
    expect(getCollection('nope')).toBeUndefined()
  })

  it('reindexCollection flips status to reindexing immediately', () => {
    vi.useFakeTimers()
    try {
      const result = reindexCollection('users')
      expect(result.status).toBe('reindexing')
      const fetched = getCollection('users')
      expect(fetched?.status).toBe('reindexing')
    } finally {
      vi.useRealTimers()
    }
  })

  it('reindexCollection updates to active after 2000ms', () => {
    vi.useFakeTimers()
    try {
      const before = getCollection('users')?.lastReindexedAt ?? 0
      reindexCollection('users')
      expect(getCollection('users')?.status).toBe('reindexing')
      vi.advanceTimersByTime(2000)
      const after = getCollection('users')
      expect(after?.status).toBe('active')
      expect(after!.lastReindexedAt).toBeGreaterThanOrEqual(before)
    } finally {
      vi.useRealTimers()
    }
  })

  it('reindexCollection throws on unknown id', () => {
    expect(() => reindexCollection('nope')).toThrow()
  })

  it('reindexCollection is idempotent during reindex window', () => {
    vi.useFakeTimers()
    try {
      reindexCollection('users')
      const second = reindexCollection('users')
      expect(second.status).toBe('reindexing')
    } finally {
      vi.useRealTimers()
    }
  })

  it('computeVectorStats totals match seed', () => {
    const cols = getCollections()
    const stats = computeVectorStats(cols)
    expect(stats.totalCollections).toBe(6)
    expect(stats.totalVectors).toBe(50_000 + 100_000 + 10_000 + 5_000 + 200_000 + 500_000)
    expect(stats.avgDimension).toBeGreaterThan(0)
  })

  it('computeVectorStats handles empty', () => {
    const stats = computeVectorStats([])
    expect(stats.totalCollections).toBe(0)
    expect(stats.totalVectors).toBe(0)
    expect(stats.avgDimension).toBe(0)
  })

  it('formatBytes scales correctly', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1.00 KB')
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB')
  })

  it('formatCompact thousands/millions', () => {
    expect(formatCompact(500)).toBe('500')
    expect(formatCompact(1500)).toBe('1.5k')
    expect(formatCompact(1_500_000)).toBe('1.5M')
  })
})
