// Wave F20.C — ChurnRiskList vitest cases.
//
// Verifies the tier filter (only at-risk + critical surface), the ascending
// score sort, the detail link target, and the impersonate trigger handoff
// (uses the onImpersonate prop, so we don't touch the global sessionStorage
// shim that ImpersonateBanner observes).

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ChurnRiskList } from '@/components/cohorts/ChurnRiskList'
import type { Tenant } from '@landx/data'

// Construct a small synthetic tenant population that covers all three tiers.
// NOTE: getTenantHealth uses `now` to compute days-since-active. Tests pin
// `now` to the same fixed instant for determinism.
const NOW = Date.parse('2026-05-14T12:00:00Z')

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

const TENANTS: Tenant[] = [
  // Healthy — active Pro, recent activity, many listings
  mkTenant({
    id: 't-healthy',
    name: 'Healthy Co',
    listingCount: 30,
    userCount: 10,
    lastActiveISO: '2026-05-13T00:00:00Z',
    status: 'Aktif',
  }),
  // Critical — churned, stale
  mkTenant({
    id: 't-critical',
    name: 'Critical Co',
    status: 'Churned',
    lastActiveISO: '2026-01-01T00:00:00Z',
    listingCount: 2,
    userCount: 1,
  }),
  // At-risk — askıda but recent enough
  mkTenant({
    id: 't-atrisk',
    name: 'AtRisk Co',
    status: 'Askıda',
    lastActiveISO: '2026-05-10T00:00:00Z',
    listingCount: 5,
    userCount: 2,
  }),
]

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ChurnRiskList', () => {
  afterEach(() => cleanup())

  it('filters down to at-risk + critical tenants', () => {
    renderWithRouter(<ChurnRiskList tenants={TENANTS} now={NOW} />)
    expect(screen.queryByTestId('churn-risk-row-t-healthy')).not.toBeInTheDocument()
    expect(screen.getByTestId('churn-risk-row-t-critical')).toBeInTheDocument()
    expect(screen.getByTestId('churn-risk-row-t-atrisk')).toBeInTheDocument()
  })

  it('sorts ascending by score (most critical first)', () => {
    renderWithRouter(<ChurnRiskList tenants={TENANTS} now={NOW} />)
    const rows = screen.getAllByRole('listitem')
    // Critical (lowest score) should come before at-risk
    expect(rows[0].getAttribute('data-testid')).toBe('churn-risk-row-t-critical')
    expect(rows[1].getAttribute('data-testid')).toBe('churn-risk-row-t-atrisk')
  })

  it('detail link points at /tenants/:id', () => {
    renderWithRouter(<ChurnRiskList tenants={TENANTS} now={NOW} />)
    const link = screen.getByTestId('churn-risk-detail-t-critical') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/tenants/t-critical')
  })

  it('impersonate button calls onImpersonate with the tenant', () => {
    const onImpersonate = vi.fn()
    renderWithRouter(
      <ChurnRiskList tenants={TENANTS} now={NOW} onImpersonate={onImpersonate} />,
    )
    fireEvent.click(screen.getByTestId('churn-risk-impersonate-t-critical'))
    expect(onImpersonate).toHaveBeenCalledTimes(1)
    expect(onImpersonate.mock.calls[0][0].id).toBe('t-critical')
  })

  it('renders the empty state when everyone is healthy', () => {
    renderWithRouter(
      <ChurnRiskList tenants={[TENANTS[0]]} now={NOW} />,
    )
    expect(screen.getByTestId('churn-risk-empty')).toBeInTheDocument()
  })

  it('shows a recommendation when the tier supplies one', () => {
    renderWithRouter(<ChurnRiskList tenants={TENANTS} now={NOW} />)
    expect(screen.getByTestId('churn-risk-rec-t-critical')).toBeInTheDocument()
  })
})
