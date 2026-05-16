// Wave F20.B — RevenueKpis vitest. Asserts 4-tile layout + dynamic
// values driven by getRevenueHistory + getChurnRate snapshots.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { RevenueKpis } from '@/components/revenue/RevenueKpis'
import type {
  ChurnSnapshot,
  MonthlyRevenue,
} from '@/lib/super-admin-tenant-analytics'

const HISTORY: MonthlyRevenue[] = [
  { month: '2026-04', mrr: 40000, arr: 480000, newMrr: 5000, churnedMrr: 1000, expansionMrr: 0 },
  { month: '2026-05', mrr: 50000, arr: 600000, newMrr: 10000, churnedMrr: 500, expansionMrr: 1000 },
]

const CHURN: ChurnSnapshot = {
  current: 4.2,
  previousMonth: 2.8,
  delta: 1.4,
}

describe('RevenueKpis', () => {
  afterEach(cleanup)

  it('renders all four KPI tiles', () => {
    render(<RevenueKpis history={HISTORY} churn={CHURN} activeTenantCount={42} />)
    expect(screen.getByTestId('revenue-kpis')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-kpi-mrr')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-kpi-arr')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-kpi-active')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-kpi-churn')).toBeInTheDocument()
  })

  it('surfaces the active tenant count + churn percent', () => {
    render(<RevenueKpis history={HISTORY} churn={CHURN} activeTenantCount={42} />)
    expect(screen.getByTestId('revenue-kpi-active')).toHaveTextContent('42')
    expect(screen.getByTestId('revenue-kpi-churn')).toHaveTextContent('4.2%')
  })

  it('falls back gracefully when history is empty', () => {
    render(<RevenueKpis history={[]} churn={CHURN} activeTenantCount={0} />)
    expect(screen.getByTestId('revenue-kpis')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-kpi-active')).toHaveTextContent('0')
  })
})
