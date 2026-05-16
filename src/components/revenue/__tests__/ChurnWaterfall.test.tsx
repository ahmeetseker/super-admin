// Wave F20.B — ChurnWaterfall vitest. Asserts triplet bars render per
// month + slice to last N months.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ChurnWaterfall } from '@/components/revenue/ChurnWaterfall'
import type { MonthlyRevenue } from '@/lib/super-admin-tenant-analytics'

const SERIES: MonthlyRevenue[] = Array.from({ length: 12 }, (_, i) => ({
  month: `2025-${String(i + 1).padStart(2, '0')}`,
  mrr: 30000 + i * 1000,
  arr: (30000 + i * 1000) * 12,
  newMrr: 2000 + (i % 3) * 500,
  churnedMrr: 500 + (i % 2) * 200,
  expansionMrr: 800 + (i % 4) * 250,
}))

describe('ChurnWaterfall', () => {
  afterEach(cleanup)

  it('renders an svg + month groups for the last N months', () => {
    render(<ChurnWaterfall history={SERIES} months={6} />)
    const svg = screen.getByTestId('revenue-waterfall-svg')
    expect(svg.tagName.toLowerCase()).toBe('svg')
    // 6 groups → 6 rect-triplets
    const groups = svg.querySelectorAll('[data-testid^="waterfall-month-"]')
    expect(groups.length).toBe(6)
    // Each group has 3 rects (new + expansion + churn)
    for (const g of Array.from(groups)) {
      expect(g.querySelectorAll('rect').length).toBe(3)
    }
  })

  it('shows the empty state when history is empty', () => {
    render(<ChurnWaterfall history={[]} />)
    expect(screen.getByTestId('revenue-waterfall-empty')).toBeInTheDocument()
  })
})
