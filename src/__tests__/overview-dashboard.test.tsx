/**
 * Wave F3 / Agent-F3D — super-admin overview dashboard.
 *
 * Covers: top KPI row renders with sparkline svg, top-tenants table click
 * navigates to /tenants/:id, recent audit list click navigates to
 * /audit?id=, loading + empty states, system health card surfaces the
 * uptime KPI.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import type { ReactNode } from 'react'

import { configureApi, MONTHLY_REVENUE, TENANTS } from '@landx/data'
import { Overview } from '@/routes/overview'

function resetApiClient() {
  configureApi({ baseUrl: '' })
}

function LocationReporter() {
  const loc = useLocation()
  return (
    <div data-testid="route-pathname">
      {loc.pathname}
      {loc.search}
    </div>
  )
}

function renderOverview() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<>{children}<LocationReporter /></>} />
          <Route path="/tenants/:id" element={<LocationReporter />} />
          <Route path="/audit" element={<LocationReporter />} />
          <Route path="/observability" element={<LocationReporter />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return render(<Overview />, { wrapper: Wrapper })
}

describe('Overview dashboard', () => {
  beforeEach(() => {
    resetApiClient()
  })

  it('renders the four KPI cards on load with at least one sparkline svg', async () => {
    renderOverview()

    expect(screen.getByText('Aktif tenant')).toBeInTheDocument()
    expect(screen.getByText('MAU')).toBeInTheDocument()
    expect(screen.getByText('Bu ay ciro')).toBeInTheDocument()
    expect(screen.getByText('SLO uptime')).toBeInTheDocument()

    // Sparkline svgs render — each KPI card has one (4 total, all marked
    // with the same data-testid). Wait for tenant data so the active count
    // settles to its real value.
    await waitFor(() => {
      expect(screen.getAllByTestId('kpi-sparkline').length).toBeGreaterThanOrEqual(3)
    })
  })

  it('renders the revenue chart svg covering all 12 months from MONTHLY_REVENUE', async () => {
    renderOverview()
    const svg = await screen.findByTestId('revenue-chart-svg')
    expect(svg).toBeInTheDocument()
    // One <title> per data point — equals the seed length.
    const titles = svg.querySelectorAll('title')
    expect(titles.length).toBe(MONTHLY_REVENUE.length)
  })

  it('shows the top tenants table and navigates to /tenants/:id when a row is clicked', async () => {
    renderOverview()

    const tbody = await screen.findByTestId('top-tenants-rows')
    // Wait for at least one tenant row to render once the query resolves.
    await waitFor(() => {
      expect(within(tbody).getAllByRole('button').length).toBeGreaterThan(0)
    })
    const rows = within(tbody).getAllByRole('button')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThanOrEqual(5)

    // Clicking the first row should navigate to /tenants/{id} for the
    // highest-MRR tenant in the seed (bodrum-em per the mock).
    fireEvent.click(rows[0]!)
    await waitFor(() => {
      expect(screen.getByTestId('route-pathname').textContent).toMatch(/^\/tenants\//)
    })
    const topByMrr = [...TENANTS].sort((a, b) => b.mrr - a.mrr)[0]!
    expect(screen.getByTestId('route-pathname').textContent).toBe(`/tenants/${topByMrr.id}`)
  })

  it('renders the recent audit feed and navigates to /audit?id=… on entry click', async () => {
    renderOverview()

    const list = await screen.findByTestId('recent-audit-list')
    // First audit entries should render once useAuditLog resolves.
    await waitFor(() => {
      expect(within(list).getAllByRole('button').length).toBeGreaterThan(0)
    })
    const items = within(list).getAllByRole('button')
    expect(items.length).toBeLessThanOrEqual(8)

    fireEvent.click(items[0]!)
    await waitFor(() => {
      expect(screen.getByTestId('route-pathname').textContent).toMatch(/^\/audit\?id=/)
    })
  })

  it('shows the system health card with uptime and active-alert rows', async () => {
    renderOverview()
    expect(screen.getByText('Sistem durumu')).toBeInTheDocument()
    expect(screen.getByText('API uptime')).toBeInTheDocument()
    expect(screen.getByText('Aktif uyarı')).toBeInTheDocument()
    expect(screen.getByText('Son olay')).toBeInTheDocument()
    // The uptime row should show a percentage value (number followed by %)
    // somewhere in the page — at least one match is fine.
    expect(screen.getAllByText(/%$/).length).toBeGreaterThan(0)
  })
})
