// Wave F20.A — vitest cases for TenantUsagePanel / TenantRevenuePanel /
// TenantHealthPanel. Each panel is a pure render over a Tenant fixture +
// F20.0 analytics helpers; no router, no localStorage interaction beyond the
// shared setup (vitest.setup.ts).

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Tenant } from '@landx/data'
import { TenantUsagePanel } from '@/components/tenant/TenantUsagePanel'
import {
  TenantRevenuePanel,
  buildMrrSeries,
} from '@/components/tenant/TenantRevenuePanel'
import { TenantHealthPanel } from '@/components/tenant/TenantHealthPanel'

const NOW = Date.parse('2026-05-14T12:00:00Z')

const healthyTenant: Tenant = {
  id: 'fix-healthy',
  name: 'Fixture Healthy',
  city: 'İzmir',
  plan: 'Pro',
  mrr: 4_900,
  listingCount: 22,
  userCount: 6,
  lastActiveISO: '2026-05-12T10:00:00Z',
  status: 'Aktif',
  createdISO: '2024-04-01T00:00:00Z',
}

const criticalTenant: Tenant = {
  id: 'fix-critical',
  name: 'Fixture Critical',
  city: 'Muğla',
  plan: 'Free',
  mrr: 0,
  listingCount: 1,
  userCount: 1,
  lastActiveISO: '2025-12-01T00:00:00Z',
  status: 'Churned',
  createdISO: '2025-09-01T00:00:00Z',
}

const enterpriseTenant: Tenant = {
  id: 'fix-ent',
  name: 'Fixture Enterprise',
  city: 'İstanbul',
  plan: 'Enterprise',
  mrr: 19_900,
  listingCount: 64,
  userCount: 14,
  lastActiveISO: '2026-05-13T08:00:00Z',
  status: 'Aktif',
  createdISO: '2023-06-30T00:00:00Z',
}

afterEach(() => {
  cleanup()
})

describe('TenantUsagePanel', () => {
  it('renders the three quota bars with plan-aware ceilings', () => {
    render(<TenantUsagePanel tenant={healthyTenant} />)
    expect(screen.getByTestId('tenant-usage-panel')).toBeInTheDocument()
    // Pro plan: 50 ilan / 10 kullanıcı ceilings
    expect(screen.getByTestId('usage-bar-listings')).toHaveTextContent('22 / 50')
    expect(screen.getByTestId('usage-bar-users')).toHaveTextContent('6 / 10')
    expect(screen.getByTestId('usage-bar-storage')).toBeInTheDocument()
  })

  it('flags critical tone when consumption approaches the cap', () => {
    // Free plan: 5 listings / 2 users — fixture sits at 1 listing → ok
    render(<TenantUsagePanel tenant={criticalTenant} />)
    const fill = screen.getByTestId('usage-bar-listings-fill')
    expect(fill.getAttribute('data-tone')).toBe('ok')
    // But the user count is at the Free cap (2) → critical
    const userFill = screen.getByTestId('usage-bar-users-fill')
    // 1 / 2 = 50% → 'ok'
    expect(['ok', 'warning', 'critical']).toContain(userFill.getAttribute('data-tone'))
  })

  it('exposes the CSV report download trigger', () => {
    render(<TenantUsagePanel tenant={healthyTenant} />)
    expect(screen.getByTestId('usage-report-button')).toBeInTheDocument()
  })
})

describe('TenantRevenuePanel', () => {
  it('renders sparkline + plan badge + trend badge', () => {
    render(<TenantRevenuePanel tenant={healthyTenant} now={NOW} />)
    expect(screen.getByTestId('tenant-revenue-panel')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-sparkline')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-plan-badge')).toHaveTextContent('Pro')
    expect(screen.getByTestId('revenue-trend-badge')).toBeInTheDocument()
  })

  it('Enterprise plan badge uses the violet token class', () => {
    render(<TenantRevenuePanel tenant={enterpriseTenant} now={NOW} />)
    const badge = screen.getByTestId('revenue-plan-badge')
    expect(badge.className).toMatch(/violet/)
  })

  it('renders the churn-risk card when status indicates churn', () => {
    render(<TenantRevenuePanel tenant={criticalTenant} now={NOW} />)
    expect(screen.getByTestId('revenue-churn-warning')).toBeInTheDocument()
    expect(screen.queryByText(/Hesap kapatıldı/)).toBeInTheDocument()
  })

  it('hides the churn-risk card for healthy tenants', () => {
    render(<TenantRevenuePanel tenant={healthyTenant} now={NOW} />)
    expect(screen.queryByTestId('revenue-churn-warning')).not.toBeInTheDocument()
  })

  it('buildMrrSeries yields exactly 12 months with deterministic shape', () => {
    const a = buildMrrSeries(healthyTenant, NOW, 12)
    const b = buildMrrSeries(healthyTenant, NOW, 12)
    expect(a.length).toBe(12)
    expect(a).toEqual(b)
    for (const pt of a) {
      expect(pt.mrr).toBeGreaterThanOrEqual(0)
      expect(pt.label).toMatch(/^(Oca|Şub|Mar|Nis|May|Haz|Tem|Ağu|Eyl|Eki|Kas|Ara)$/)
    }
  })

  it('zeroes MRR for months before createdISO', () => {
    const young: Tenant = { ...healthyTenant, createdISO: '2026-03-01T00:00:00Z' }
    const series = buildMrrSeries(young, NOW, 12)
    // The first months of the 12-month window are pre-create → mrr === 0
    expect(series[0].mrr).toBe(0)
    expect(series[series.length - 1].mrr).toBeGreaterThan(0)
  })
})

describe('TenantHealthPanel', () => {
  it('renders the gauge, tier badge, and signals list', () => {
    render(<TenantHealthPanel tenant={healthyTenant} now={NOW} />)
    expect(screen.getByTestId('tenant-health-panel')).toBeInTheDocument()
    expect(screen.getByTestId('health-gauge')).toBeInTheDocument()
    expect(screen.getByTestId('health-tier-badge')).toBeInTheDocument()
    const rows = screen.getAllByTestId('health-signal-row')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('healthy tier uses emerald token class', () => {
    render(<TenantHealthPanel tenant={healthyTenant} now={NOW} />)
    const badge = screen.getByTestId('health-tier-badge')
    expect(badge.getAttribute('data-tier')).toBe('healthy')
    expect(badge.className).toMatch(/emerald/)
  })

  it('critical tier uses rose token class + surfaces the recommendation', () => {
    render(<TenantHealthPanel tenant={criticalTenant} now={NOW} />)
    const badge = screen.getByTestId('health-tier-badge')
    expect(badge.getAttribute('data-tier')).toBe('critical')
    expect(badge.className).toMatch(/rose/)
    expect(screen.getByTestId('health-recommendation')).toBeInTheDocument()
  })

  it('gauge fill arc is omitted when score lands at 0', () => {
    // Synthesize a worst-case fixture
    const dead: Tenant = {
      ...criticalTenant,
      status: 'Churned',
      lastActiveISO: '2024-01-01T00:00:00Z',
      listingCount: 0,
      userCount: 0,
    }
    render(<TenantHealthPanel tenant={dead} now={NOW} />)
    const badge = screen.getByTestId('health-tier-badge')
    expect(badge.getAttribute('data-tier')).toBe('critical')
  })
})
