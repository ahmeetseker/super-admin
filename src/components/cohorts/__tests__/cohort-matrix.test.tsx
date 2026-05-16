// Wave F20.C — CohortMatrix vitest cases.
//
// Covers render shape, the rose/amber/emerald intensity bands, and the
// "most recent N rows" truncation/order.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CohortMatrix, intensityClass } from '@/components/cohorts/CohortMatrix'
import type { CohortRow } from '@/lib/super-admin-tenant-analytics'

const ROWS: CohortRow[] = [
  { signupMonth: '2024-01', size: 4, retention30d: 90, retention60d: 80, retention90d: 70 },
  { signupMonth: '2024-04', size: 6, retention30d: 60, retention60d: 50, retention90d: 40 },
  { signupMonth: '2024-08', size: 2, retention30d: 30, retention60d: 20, retention90d: 10 },
]

describe('intensityClass', () => {
  afterEach(() => cleanup())

  it('returns rose tint below 50%', () => {
    expect(intensityClass(0)).toMatch(/rose/)
    expect(intensityClass(49.9)).toMatch(/rose/)
  })
  it('returns amber tint between 50% and 75%', () => {
    expect(intensityClass(50)).toMatch(/amber/)
    expect(intensityClass(74.9)).toMatch(/amber/)
  })
  it('returns emerald tint at 75% and above', () => {
    expect(intensityClass(75)).toMatch(/emerald/)
    expect(intensityClass(100)).toMatch(/emerald/)
  })
})

describe('CohortMatrix', () => {
  afterEach(() => cleanup())

  it('renders one row per cohort', () => {
    render(<CohortMatrix rows={ROWS} />)
    expect(screen.getByTestId('cohort-row-2024-01')).toBeInTheDocument()
    expect(screen.getByTestId('cohort-row-2024-04')).toBeInTheDocument()
    expect(screen.getByTestId('cohort-row-2024-08')).toBeInTheDocument()
  })

  it('renders 3 cells per row (30/60/90)', () => {
    render(<CohortMatrix rows={ROWS} />)
    expect(screen.getByTestId('cohort-cell-2024-01-30d')).toBeInTheDocument()
    expect(screen.getByTestId('cohort-cell-2024-01-60d')).toBeInTheDocument()
    expect(screen.getByTestId('cohort-cell-2024-01-90d')).toBeInTheDocument()
  })

  it('applies rose tint to a <50% cell', () => {
    render(<CohortMatrix rows={ROWS} />)
    const cell = screen.getByTestId('cohort-cell-2024-08-30d')
    expect(cell.className).toMatch(/rose/)
  })

  it('applies emerald tint to a >=75% cell', () => {
    render(<CohortMatrix rows={ROWS} />)
    const cell = screen.getByTestId('cohort-cell-2024-01-30d')
    expect(cell.className).toMatch(/emerald/)
  })

  it('applies amber tint to a 50-75% cell', () => {
    render(<CohortMatrix rows={ROWS} />)
    const cell = screen.getByTestId('cohort-cell-2024-04-30d')
    expect(cell.className).toMatch(/amber/)
  })

  it('shows percent and absolute retained counts in each cell', () => {
    render(<CohortMatrix rows={ROWS} />)
    // 90% of 4 = 3.6 → rounds to 4
    const cell = screen.getByTestId('cohort-cell-2024-01-30d')
    expect(cell.textContent).toContain('90%')
    expect(cell.textContent).toContain('4/4')
  })

  it('empty state when no rows are provided', () => {
    render(<CohortMatrix rows={[]} />)
    expect(screen.getByTestId('cohort-matrix-empty')).toBeInTheDocument()
  })

  it('caps to the most recent maxRows in ascending order', () => {
    const many: CohortRow[] = Array.from({ length: 8 }, (_, i) => ({
      signupMonth: `2024-${String(i + 1).padStart(2, '0')}`,
      size: 5,
      retention30d: 80,
      retention60d: 70,
      retention90d: 60,
    }))
    render(<CohortMatrix rows={many} maxRows={3} />)
    expect(screen.queryByTestId('cohort-row-2024-01')).not.toBeInTheDocument()
    expect(screen.getByTestId('cohort-row-2024-06')).toBeInTheDocument()
    expect(screen.getByTestId('cohort-row-2024-07')).toBeInTheDocument()
    expect(screen.getByTestId('cohort-row-2024-08')).toBeInTheDocument()
    // Display order is ascending so the oldest of the cropped set comes first.
    const rows = screen.getAllByRole('row')
    // First row is header; subsequent rows in DOM order
    expect(rows[1].getAttribute('data-testid')).toBe('cohort-row-2024-06')
    expect(rows[3].getAttribute('data-testid')).toBe('cohort-row-2024-08')
  })
})
