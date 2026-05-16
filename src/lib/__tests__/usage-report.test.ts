// Wave F13.B — unit tests for the deterministic 30-day usage CSV generator
// that backs `UsageReportButton`. Exposes `buildUsageRows` so QA can repro
// any tenant's CSV by seed alone.

import { beforeEach, describe, expect, it } from 'vitest'
import { buildUsageRows } from '@/components/tenant/UsageReportButton'

describe('UsageReportButton :: buildUsageRows', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  })

  it('returns exactly 30 daily rows by default', () => {
    const rows = buildUsageRows('tnt-test-1', undefined, Date.parse('2026-05-14T00:00:00Z'))
    expect(rows).toHaveLength(30)
  })

  it('is deterministic for the same tenantId+now', () => {
    const a = buildUsageRows('tnt-acme', 30, Date.parse('2026-05-14T00:00:00Z'))
    const b = buildUsageRows('tnt-acme', 30, Date.parse('2026-05-14T00:00:00Z'))
    expect(a).toEqual(b)
  })

  it('yields different series for different tenantIds', () => {
    const a = buildUsageRows('tnt-acme', 30, Date.parse('2026-05-14T00:00:00Z'))
    const b = buildUsageRows('tnt-other', 30, Date.parse('2026-05-14T00:00:00Z'))
    expect(a).not.toEqual(b)
  })

  it('orders rows oldest → newest by ISO date', () => {
    const rows = buildUsageRows('tnt-test-1', 30, Date.parse('2026-05-14T00:00:00Z'))
    const sorted = [...rows].sort((x, y) => x.date.localeCompare(y.date))
    expect(rows).toEqual(sorted)
  })

  it('produces sane numeric ranges (requests > 0, costTL > 0)', () => {
    const rows = buildUsageRows('tnt-test-1', 30, Date.parse('2026-05-14T00:00:00Z'))
    for (const r of rows) {
      expect(r.requests).toBeGreaterThan(0)
      expect(r.storageMB).toBeGreaterThan(0)
      expect(r.costTL).toBeGreaterThan(0)
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('respects custom day counts', () => {
    expect(buildUsageRows('tnt-x', 7, Date.now())).toHaveLength(7)
    expect(buildUsageRows('tnt-x', 1, Date.now())).toHaveLength(1)
  })
})
