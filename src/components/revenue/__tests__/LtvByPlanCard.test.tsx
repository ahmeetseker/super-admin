// Wave F20.B — LtvByPlanCard vitest. One card per plan row + empty state.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { LtvByPlanCard } from '@/components/revenue/LtvByPlanCard'
import type { LtvByPlan } from '@/lib/super-admin-tenant-analytics'

const ROWS: LtvByPlan[] = [
  { plan: 'Enterprise', count: 2, meanMrr: 17400, ltv: 414285 },
  { plan: 'Pro', count: 5, meanMrr: 4900, ltv: 116666 },
  { plan: 'Free', count: 1, meanMrr: 0, ltv: 0 },
]

describe('LtvByPlanCard', () => {
  afterEach(cleanup)

  it('renders one card per plan row', () => {
    render(<LtvByPlanCard rows={ROWS} />)
    expect(screen.getByTestId('revenue-ltv-grid')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-ltv-enterprise')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-ltv-pro')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-ltv-free')).toBeInTheDocument()
  })

  it('shows tenant count + mean MRR + LTV per plan', () => {
    render(<LtvByPlanCard rows={ROWS} />)
    const proCard = screen.getByTestId('revenue-ltv-pro')
    expect(proCard).toHaveTextContent('5 tenant')
    expect(screen.getByTestId('revenue-ltv-value-pro')).toBeInTheDocument()
  })

  it('shows the empty state when no rows', () => {
    render(<LtvByPlanCard rows={[]} />)
    expect(screen.getByTestId('revenue-ltv-empty')).toBeInTheDocument()
  })
})
