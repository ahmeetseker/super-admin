// Wave F21.C — RequestHistoryTable vitest cases.
//
// Verifies the table renders the injected rows in order, surfaces the
// correct status pill, filters by kind, and shows the empty state when
// the source list is empty.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RequestHistoryTable } from '@/components/data-rights/RequestHistoryTable'
import type { DataRightsRequest } from '@/lib/data-rights'

const ROWS: DataRightsRequest[] = [
  {
    id: 'dr_1',
    kind: 'export',
    tenantId: 't-1',
    tenantName: 'Tenant One',
    requestedBy: 'ops@arsam.local',
    requestedISO: '2026-05-14T10:00:00Z',
    status: 'completed',
    completedISO: '2026-05-14T10:01:00Z',
  },
  {
    id: 'dr_2',
    kind: 'delete',
    tenantId: 't-2',
    tenantName: 'Tenant Two',
    requestedBy: 'ops@arsam.local',
    requestedISO: '2026-05-14T09:00:00Z',
    status: 'pending',
  },
  {
    id: 'dr_3',
    kind: 'delete',
    tenantId: 't-3',
    tenantName: 'Tenant Three',
    requestedBy: 'ops@arsam.local',
    requestedISO: '2026-05-14T08:00:00Z',
    status: 'cancelled',
  },
]

describe('RequestHistoryTable', () => {
  afterEach(() => cleanup())

  it('renders all injected rows by default', () => {
    render(<RequestHistoryTable rows={ROWS} />)
    expect(screen.getByTestId('request-history-row-dr_1')).toBeInTheDocument()
    expect(screen.getByTestId('request-history-row-dr_2')).toBeInTheDocument()
    expect(screen.getByTestId('request-history-row-dr_3')).toBeInTheDocument()
  })

  it('renders status pills with the right tone class', () => {
    render(<RequestHistoryTable rows={ROWS} />)
    const completed = screen.getByTestId('request-history-status-dr_1')
    expect(completed.className).toContain('emerald')
    const pending = screen.getByTestId('request-history-status-dr_2')
    expect(pending.className).toContain('amber')
    const cancelled = screen.getByTestId('request-history-status-dr_3')
    expect(cancelled.className).toContain('stone')
  })

  it('export filter hides delete rows', () => {
    render(<RequestHistoryTable rows={ROWS} />)
    fireEvent.click(screen.getByTestId('request-history-filter-export'))
    expect(screen.getByTestId('request-history-row-dr_1')).toBeInTheDocument()
    expect(screen.queryByTestId('request-history-row-dr_2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('request-history-row-dr_3')).not.toBeInTheDocument()
  })

  it('delete filter hides export rows', () => {
    render(<RequestHistoryTable rows={ROWS} />)
    fireEvent.click(screen.getByTestId('request-history-filter-delete'))
    expect(screen.queryByTestId('request-history-row-dr_1')).not.toBeInTheDocument()
    expect(screen.getByTestId('request-history-row-dr_2')).toBeInTheDocument()
    expect(screen.getByTestId('request-history-row-dr_3')).toBeInTheDocument()
  })

  it('shows the empty state when no rows match', () => {
    render(<RequestHistoryTable rows={[]} />)
    expect(screen.getByTestId('request-history-empty')).toBeInTheDocument()
  })

  it('preserves source order (lib already sorts desc by requestedISO)', () => {
    render(<RequestHistoryTable rows={ROWS} />)
    const rendered = screen.getAllByTestId(/^request-history-row-/)
    expect(rendered[0].getAttribute('data-testid')).toBe('request-history-row-dr_1')
    expect(rendered[2].getAttribute('data-testid')).toBe('request-history-row-dr_3')
  })
})
