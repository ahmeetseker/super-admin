// Wave F20.C — RetentionSummary vitest cases.
//
// Pure aggregation helpers are exercised directly (weightedRetention,
// countAtRisk). The rendered KpiCard strip is checked for value text +
// risk count breakdown.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import {
  RetentionSummary,
  countAtRisk,
  weightedRetention,
} from '@/components/cohorts/RetentionSummary'
import type { Tenant } from '@landx/data'
import type { CohortRow } from '@/lib/super-admin-tenant-analytics'

const NOW = Date.parse('2026-05-14T12:00:00Z')

const ROWS: CohortRow[] = [
  { signupMonth: '2024-01', size: 4, retention30d: 100, retention60d: 75, retention90d: 50 },
  { signupMonth: '2024-04', size: 6, retention30d: 50, retention60d: 50, retention90d: 50 },
]

function mkTenant(over: Partial<Tenant> & Pick<Tenant, 'id' | 'name'>): Tenant {
  return {
    city: 'Test',
    plan: 'Pro',
    mrr: 4900,
    listingCount: 10,
    userCount: 4,
    status: 'Aktif',
    lastActiveISO: '2026-05-13T00:00:00Z',
    createdISO: '2024-01-01T00:00:00Z',
    ...over,
  } as Tenant
}

describe('weightedRetention', () => {
  it('returns 0 when no rows', () => {
    expect(weightedRetention([], 'retention30d')).toBe(0)
  })

  it('weights by cohort size', () => {
    // (100*4 + 50*6) / 10 = 700/10 = 70
    expect(weightedRetention(ROWS, 'retention30d')).toBe(70)
    // (75*4 + 50*6) / 10 = (300+300)/10 = 60
    expect(weightedRetention(ROWS, 'retention60d')).toBe(60)
    // (50*4 + 50*6) / 10 = 50
    expect(weightedRetention(ROWS, 'retention90d')).toBe(50)
  })

  it('handles 0-size cohorts safely', () => {
    const zero: CohortRow[] = [
      { signupMonth: '2024-01', size: 0, retention30d: 100, retention60d: 100, retention90d: 100 },
    ]
    expect(weightedRetention(zero, 'retention30d')).toBe(0)
  })
})

describe('countAtRisk', () => {
  it('splits tenants into at-risk vs critical buckets', () => {
    const tenants: Tenant[] = [
      mkTenant({ id: 'h', name: 'Healthy', listingCount: 30, userCount: 10 }),
      mkTenant({
        id: 'c',
        name: 'Critical',
        status: 'Churned',
        lastActiveISO: '2026-01-01T00:00:00Z',
        listingCount: 2,
        userCount: 1,
      }),
      mkTenant({
        id: 'r',
        name: 'At-risk',
        status: 'Askıda',
        lastActiveISO: '2026-05-10T00:00:00Z',
        listingCount: 5,
        userCount: 2,
      }),
    ]
    const out = countAtRisk(tenants, NOW)
    expect(out.critical).toBeGreaterThanOrEqual(1)
    expect(out.atRisk + out.critical).toBe(2)
  })
})

describe('RetentionSummary', () => {
  afterEach(() => cleanup())

  it('renders four KPI tiles', () => {
    render(
      <RetentionSummary rows={ROWS} tenants={[]} now={NOW} />,
    )
    expect(screen.getByTestId('retention-kpi-30d')).toBeInTheDocument()
    expect(screen.getByTestId('retention-kpi-60d')).toBeInTheDocument()
    expect(screen.getByTestId('retention-kpi-90d')).toBeInTheDocument()
    expect(screen.getByTestId('retention-kpi-risk')).toBeInTheDocument()
  })

  it('displays the weighted 30d retention', () => {
    render(
      <RetentionSummary rows={ROWS} tenants={[]} now={NOW} />,
    )
    expect(screen.getByTestId('retention-kpi-30d').textContent).toContain('70%')
  })

  it('shows the combined risk count', () => {
    const tenants: Tenant[] = [
      mkTenant({
        id: 'c',
        name: 'Critical',
        status: 'Churned',
        lastActiveISO: '2026-01-01T00:00:00Z',
        listingCount: 2,
        userCount: 1,
      }),
      mkTenant({
        id: 'r',
        name: 'At-risk',
        status: 'Askıda',
        lastActiveISO: '2026-05-10T00:00:00Z',
        listingCount: 5,
        userCount: 2,
      }),
    ]
    render(
      <RetentionSummary rows={ROWS} tenants={tenants} now={NOW} />,
    )
    expect(screen.getByTestId('retention-kpi-risk').textContent).toContain('2')
  })
})
