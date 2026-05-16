import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createFeatureFlag,
  deleteFeatureFlag,
  getFeatureFlag,
  getFeatureFlags,
  isFeatureEnabled,
  resetFeatureFlagsForTests,
  toggleFeatureFlag,
  updateFeatureFlag,
} from '@/lib/feature-flags'

describe('feature-flags store', () => {
  beforeEach(() => {
    resetFeatureFlagsForTests()
  })
  afterEach(() => {
    resetFeatureFlagsForTests()
  })

  it('seeds 8 flags on first read', () => {
    expect(getFeatureFlags().length).toBe(8)
  })

  it('createFeatureFlag persists new entry', () => {
    const flag = createFeatureFlag({ key: 'new-thing', name: 'Yeni özellik' })
    expect(flag.key).toBe('new-thing')
    expect(flag.enabled).toBe(false)
    expect(getFeatureFlag(flag.id)).toBeTruthy()
  })

  it('createFeatureFlag rejects duplicate key', () => {
    createFeatureFlag({ key: 'dup', name: 'D' })
    expect(() => createFeatureFlag({ key: 'dup', name: 'D2' })).toThrow()
  })

  it('toggleFeatureFlag flips enabled', () => {
    const flag = createFeatureFlag({ key: 't', name: 'T' })
    expect(toggleFeatureFlag(flag.id)?.enabled).toBe(true)
    expect(toggleFeatureFlag(flag.id)?.enabled).toBe(false)
  })

  it('updateFeatureFlag merges patch + bumps modifiedISO', async () => {
    const flag = createFeatureFlag({ key: 'u', name: 'U' })
    const stamp = flag.modifiedISO
    await new Promise((r) => setTimeout(r, 5))
    const next = updateFeatureFlag(flag.id, { rolloutPct: 75 })
    expect(next?.rolloutPct).toBe(75)
    expect(next?.modifiedISO).not.toBe(stamp)
  })

  it('deleteFeatureFlag removes the record', () => {
    const flag = createFeatureFlag({ key: 'd', name: 'D' })
    deleteFeatureFlag(flag.id)
    expect(getFeatureFlag(flag.id)).toBeNull()
  })
})

describe('isFeatureEnabled', () => {
  beforeEach(() => {
    resetFeatureFlagsForTests()
  })
  afterEach(() => {
    resetFeatureFlagsForTests()
  })

  it('returns false for missing keys', () => {
    expect(isFeatureEnabled('does-not-exist')).toBe(false)
  })

  it('returns true for fully-rolled-out seeded flag', () => {
    expect(isFeatureEnabled('dark-mode')).toBe(true)
  })

  it('honours environment filter', () => {
    expect(
      isFeatureEnabled('ip-allowlist-enforcement', { environment: 'production' }),
    ).toBe(false)
  })

  it('rolloutPct 0 always returns false', () => {
    expect(isFeatureEnabled('realtime-messaging')).toBe(false)
  })

  it('hashUser bucketing is stable for same userId', () => {
    const f = createFeatureFlag({ key: 'partial', name: 'P', rolloutPct: 50 })
    updateFeatureFlag(f.id, { enabled: true })
    const a = isFeatureEnabled('partial', { userId: 'user_42' })
    const b = isFeatureEnabled('partial', { userId: 'user_42' })
    expect(a).toBe(b)
  })
})
