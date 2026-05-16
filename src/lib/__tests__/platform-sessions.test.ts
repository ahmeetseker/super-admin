// Wave F12.A — platform-sessions.ts unit tests.
import { beforeEach, describe, expect, it } from 'vitest'
import { TENANTS } from '@landx/data'
import {
  computeSessionKpis,
  getPlatformSessions,
  getSessionActions,
  resetPlatformSessionsForTests,
  seedPlatformSessions,
  statusBreakdown,
} from '@/lib/platform-sessions'

beforeEach(() => {
  resetPlatformSessionsForTests()
})

describe('platform-sessions — seed', () => {
  it('seeds 150 deterministic sessions', () => {
    const sessions = getPlatformSessions()
    expect(sessions).toHaveLength(150)
    resetPlatformSessionsForTests()
    const again = seedPlatformSessions()
    expect(again.map((s) => s.id)).toEqual(sessions.map((s) => s.id))
    expect(again.map((s) => s.status)).toEqual(sessions.map((s) => s.status))
  })

  it('all sessions fall within the last 30 days', () => {
    const sessions = getPlatformSessions()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    const newest = Math.max(...sessions.map((s) => s.startedAt))
    for (const s of sessions) {
      expect(newest - s.startedAt).toBeLessThanOrEqual(thirtyDays)
      if (s.endedAt) expect(s.endedAt).toBeGreaterThanOrEqual(s.startedAt)
    }
  })

  it('actor + status enums are bounded', () => {
    const sessions = getPlatformSessions()
    for (const s of sessions) {
      expect(['user', 'service', 'agent']).toContain(s.actorType)
      expect(['active', 'expired', 'revoked']).toContain(s.status)
      expect(s.actionCount).toBeGreaterThan(0)
      expect(s.actorName.length).toBeGreaterThan(0)
    }
  })

  it('tenantIds reference TENANTS', () => {
    const tenantIds = new Set(TENANTS.map((t) => t.id))
    for (const s of getPlatformSessions()) {
      expect(tenantIds.has(s.tenantId)).toBe(true)
    }
  })

  it('active sessions have null endedAt', () => {
    const sessions = getPlatformSessions()
    const actives = sessions.filter((s) => s.status === 'active')
    for (const a of actives) expect(a.endedAt).toBeNull()
    // Non-active sessions must have an endedAt
    for (const s of sessions.filter((s) => s.status !== 'active')) {
      expect(s.endedAt).not.toBeNull()
    }
  })
})

describe('platform-sessions — KPIs and breakdown', () => {
  it('computeSessionKpis sums counts to total', () => {
    const sessions = getPlatformSessions()
    const k = computeSessionKpis(sessions)
    expect(k.totalSessions).toBe(150)
    expect(k.activeNow + k.expiredCount + k.revokedCount).toBe(150)
    expect(k.totalActions).toBeGreaterThan(0)
  })

  it('computeSessionKpis returns zeros on empty', () => {
    const k = computeSessionKpis([])
    expect(k.totalSessions).toBe(0)
    expect(k.activeNow).toBe(0)
    expect(k.avgDurationMs).toBe(0)
  })

  it('statusBreakdown shares sum to ~1', () => {
    const slices = statusBreakdown(getPlatformSessions())
    expect(slices).toHaveLength(3)
    const total = slices.reduce((s, x) => s + x.share, 0)
    expect(total).toBeGreaterThan(0.99)
    expect(total).toBeLessThan(1.01)
  })
})

describe('platform-sessions — action log', () => {
  it('getSessionActions returns deterministic, sorted entries', () => {
    const session = getPlatformSessions()[0]
    const first = getSessionActions(session)
    const second = getSessionActions(session)
    expect(first).toBe(second) // memoised
    expect(first.length).toBeGreaterThan(0)
    for (let i = 1; i < first.length; i++) {
      expect(first[i].ts).toBeGreaterThanOrEqual(first[i - 1].ts)
    }
  })
})
