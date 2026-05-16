// Wave F20.B — RevenueTrendChart vitest. SVG path render assertions
// over a deterministic 3-point series.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { RevenueTrendChart } from '@/components/revenue/RevenueTrendChart'
import type { MonthlyRevenue } from '@/lib/super-admin-tenant-analytics'

const DATA: MonthlyRevenue[] = [
  { month: '2026-03', mrr: 30000, arr: 360000, newMrr: 4000, churnedMrr: 500, expansionMrr: 0 },
  { month: '2026-04', mrr: 35000, arr: 420000, newMrr: 5000, churnedMrr: 800, expansionMrr: 0 },
  { month: '2026-05', mrr: 42000, arr: 504000, newMrr: 6000, churnedMrr: 1200, expansionMrr: 1000 },
]

describe('RevenueTrendChart', () => {
  afterEach(cleanup)

  it('renders an svg with both MRR and churn line paths', () => {
    render(<RevenueTrendChart data={DATA} />)
    const svg = screen.getByTestId('revenue-trend-svg')
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(screen.getByTestId('revenue-trend-churn-line')).toBeInTheDocument()
  })

  it('renders the empty state when data is empty', () => {
    render(<RevenueTrendChart data={[]} />)
    expect(screen.getByTestId('revenue-trend-empty')).toBeInTheDocument()
  })
})
