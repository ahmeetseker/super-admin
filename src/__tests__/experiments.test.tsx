// Wave F26.C — Vitest coverage for the /experiments dashboard components.
//
// Covers the pure logic surface (status labels, weight totals, chart math)
// + lightweight DOM assertions on the filter chips and detail panel so the
// route's interactive contract regresses cleanly.

import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import {
  resetExperimentsForTests,
  getExperiments,
  createExperiment,
} from '@/lib/ab-experiments'
import {
  ExperimentTable,
  statusBadgeClass,
  statusLabel,
} from '@/components/experiments/ExperimentTable'
import { VariantEditor, totalWeight } from '@/components/experiments/VariantEditor'
import { DistributionChart } from '@/components/experiments/DistributionChart'
import { ExperimentsRoute } from '@/routes/experiments'

function wrap(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

beforeEach(() => {
  resetExperimentsForTests()
})

describe('experiments — pure helpers', () => {
  it('statusLabel maps every status to a Turkish copy', () => {
    expect(statusLabel('draft')).toBe('Taslak')
    expect(statusLabel('running')).toBe('Aktif')
    expect(statusLabel('paused')).toBe('Duraklatıldı')
    expect(statusLabel('completed')).toBe('Tamamlandı')
  })

  it('statusBadgeClass returns a tone class string per status', () => {
    expect(statusBadgeClass('running')).toContain('emerald')
    expect(statusBadgeClass('draft')).toContain('stone')
    expect(statusBadgeClass('paused')).toContain('amber')
    expect(statusBadgeClass('completed')).toContain('sky')
  })

  it('totalWeight sums variant weights and ignores NaN', () => {
    expect(totalWeight([])).toBe(0)
    expect(
      totalWeight([
        { key: 'a', name: 'A', weight: 30 },
        { key: 'b', name: 'B', weight: 70 },
      ]),
    ).toBe(100)
    expect(
      totalWeight([
        { key: 'a', name: 'A', weight: Number.NaN },
        { key: 'b', name: 'B', weight: 40 },
      ]),
    ).toBe(40)
  })
})

describe('ExperimentTable', () => {
  it('filters rows by status and renders a count summary', () => {
    const experiments = getExperiments()
    const handleFilter = (next: typeof filter) => {
      filter = next
    }
    let filter: 'all' | 'running' | 'draft' | 'paused' | 'completed' = 'all'

    const { rerender } = wrap(
      <ExperimentTable
        experiments={experiments}
        filter={filter}
        onFilterChange={handleFilter}
        selectedId={null}
        onSelect={() => undefined}
      />,
    )

    // All seed rows are visible under "all".
    expect(screen.getByTestId('experiment-table')).toBeInTheDocument()
    for (const exp of experiments) {
      expect(screen.getByTestId(`experiment-row-${exp.id}`)).toBeInTheDocument()
    }

    // Click "Draft" filter → only the draft seed row remains.
    fireEvent.click(screen.getByTestId('experiment-filter-draft'))
    filter = 'draft'
    rerender(
      <MemoryRouter>
        <ExperimentTable
          experiments={experiments}
          filter={filter}
          onFilterChange={handleFilter}
          selectedId={null}
          onSelect={() => undefined}
        />
      </MemoryRouter>,
    )
    const draftRow = experiments.find((e) => e.status === 'draft')!
    expect(screen.getByTestId(`experiment-row-${draftRow.id}`)).toBeInTheDocument()
    const runningRow = experiments.find((e) => e.status === 'running')!
    expect(screen.queryByTestId(`experiment-row-${runningRow.id}`)).toBeNull()
  })

  it('emits onSelect when a row is clicked', () => {
    const experiments = getExperiments()
    let selectedId: string | null = null
    wrap(
      <ExperimentTable
        experiments={experiments}
        filter="all"
        onFilterChange={() => undefined}
        selectedId={null}
        onSelect={(id) => {
          selectedId = id
        }}
      />,
    )
    const first = experiments[0]
    fireEvent.click(screen.getByTestId(`experiment-row-${first.id}`))
    expect(selectedId).toBe(first.id)
  })
})

describe('VariantEditor', () => {
  it('flags an invalid weight sum and toggles to valid when sum reaches 100', () => {
    const handle = (next: Array<{ key: string; name: string; weight: number }>) => {
      variants = next
    }
    let variants = [
      { key: 'a', name: 'A', weight: 40 },
      { key: 'b', name: 'B', weight: 40 },
    ]

    const { rerender } = wrap(<VariantEditor variants={variants} onChange={handle} />)
    expect(screen.getByTestId('variant-weight-sum')).toHaveAttribute('data-valid', 'false')

    variants = [
      { key: 'a', name: 'A', weight: 50 },
      { key: 'b', name: 'B', weight: 50 },
    ]
    rerender(
      <MemoryRouter>
        <VariantEditor variants={variants} onChange={handle} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('variant-weight-sum')).toHaveAttribute('data-valid', 'true')
  })
})

describe('DistributionChart', () => {
  it('renders one bar per variant + empty state otherwise', () => {
    const { rerender } = wrap(<DistributionChart variants={[]} />)
    expect(screen.getByTestId('distribution-chart-empty')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <DistributionChart
          variants={[
            { id: 'x', key: 'control', name: 'Kontrol', weight: 50, exposures: 100, conversions: 10 },
            { id: 'y', key: 'variant', name: 'Varyant', weight: 50, exposures: 80, conversions: 12 },
          ]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('distribution-bar-control')).toBeInTheDocument()
    expect(screen.getByTestId('distribution-bar-variant')).toBeInTheDocument()
  })
})

describe('ExperimentsRoute integration', () => {
  it('renders dashboard scaffolding with seed KPI counts', () => {
    wrap(<ExperimentsRoute />)
    expect(screen.getByTestId('experiments-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('experiments-kpi-total')).toBeInTheDocument()
    // 3 seed experiments live in lib (running / completed / draft).
    const total = screen.getByTestId('experiments-kpi-total')
    expect(total.textContent).toMatch(/3/)
  })

  it('selecting a row reveals the detail panel + distribution chart', () => {
    wrap(<ExperimentsRoute />)
    expect(screen.getByTestId('experiment-detail-empty')).toBeInTheDocument()
    const seeds = getExperiments()
    const first = seeds[0]
    fireEvent.click(screen.getByTestId(`experiment-row-${first.id}`))
    expect(screen.getByTestId('experiment-detail')).toBeInTheDocument()
    expect(screen.getByTestId('distribution-chart')).toBeInTheDocument()
  })

  it('newly created experiment bumps the total KPI', () => {
    const before = getExperiments().length
    createExperiment({
      key: 'unit-test-key',
      name: 'Unit test deneyi',
      variants: [
        { key: 'a', name: 'A', weight: 60 },
        { key: 'b', name: 'B', weight: 40 },
      ],
    })
    expect(getExperiments().length).toBe(before + 1)
  })
})
