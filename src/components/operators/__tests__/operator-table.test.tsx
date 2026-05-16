// Wave F21.A — OperatorTable unit tests.
// Exercises search + role + status filters and the row-level action menu.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { OperatorTable } from '@/components/operators/OperatorTable'
import type { Operator } from '@/lib/operator-store'

const sampleOperators: Operator[] = [
  {
    id: 'op_a',
    email: 'ahmet@turksab.com',
    name: 'Ahmet Şeker',
    roleId: 'super-admin',
    status: 'active',
    twofaEnrolled: true,
    createdISO: '2026-04-01T00:00:00Z',
    lastLoginISO: '2026-05-11T08:00:00Z',
  },
  {
    id: 'op_b',
    email: 'destek@turksab.com',
    name: 'Destek Bir',
    roleId: 'support',
    status: 'invited',
    twofaEnrolled: false,
    createdISO: '2026-05-01T00:00:00Z',
  },
  {
    id: 'op_c',
    email: 'finans@turksab.com',
    name: 'Finans Lead',
    roleId: 'billing-ops',
    status: 'suspended',
    twofaEnrolled: true,
    createdISO: '2026-03-01T00:00:00Z',
    lastLoginISO: '2026-05-02T10:00:00Z',
  },
]

function setup() {
  const handlers = {
    onEdit: vi.fn(),
    onSuspend: vi.fn(),
    onReactivate: vi.fn(),
    onResendInvite: vi.fn(),
    onDelete: vi.fn(),
  }
  render(<OperatorTable operators={sampleOperators} {...handlers} />)
  return handlers
}

describe('OperatorTable', () => {
  beforeEach(() => {
    // Each test gets a fresh DOM.
  })
  afterEach(() => cleanup())

  it('renders all operators by default', () => {
    setup()
    expect(screen.getByTestId('operator-row-op_a')).toBeInTheDocument()
    expect(screen.getByTestId('operator-row-op_b')).toBeInTheDocument()
    expect(screen.getByTestId('operator-row-op_c')).toBeInTheDocument()
  })

  it('filters rows by search query (name / email)', () => {
    setup()
    fireEvent.change(screen.getByTestId('operator-search'), {
      target: { value: 'finans' },
    })
    expect(screen.queryByTestId('operator-row-op_a')).toBeNull()
    expect(screen.queryByTestId('operator-row-op_b')).toBeNull()
    expect(screen.getByTestId('operator-row-op_c')).toBeInTheDocument()
  })

  it('filters rows by role', () => {
    setup()
    fireEvent.change(screen.getByTestId('operator-role-filter'), {
      target: { value: 'support' },
    })
    expect(screen.queryByTestId('operator-row-op_a')).toBeNull()
    expect(screen.getByTestId('operator-row-op_b')).toBeInTheDocument()
    expect(screen.queryByTestId('operator-row-op_c')).toBeNull()
  })

  it('filters rows by status tab', () => {
    setup()
    fireEvent.click(screen.getByTestId('operator-status-filter-suspended'))
    expect(screen.queryByTestId('operator-row-op_a')).toBeNull()
    expect(screen.queryByTestId('operator-row-op_b')).toBeNull()
    expect(screen.getByTestId('operator-row-op_c')).toBeInTheDocument()
  })

  it('shows the empty-state row when filters exclude everything', () => {
    setup()
    fireEvent.change(screen.getByTestId('operator-search'), {
      target: { value: 'zzzz-no-match' },
    })
    expect(screen.getByTestId('operator-empty')).toBeInTheDocument()
  })

  it('opens action menu and invokes suspend handler for active operator', () => {
    const handlers = setup()
    fireEvent.click(screen.getByTestId('operator-actions-op_a'))
    fireEvent.click(screen.getByTestId('operator-action-suspend-op_a'))
    expect(handlers.onSuspend).toHaveBeenCalledTimes(1)
    expect(handlers.onSuspend.mock.calls[0]![0].id).toBe('op_a')
  })

  it('shows reactivate menu item only for suspended rows', () => {
    setup()
    fireEvent.click(screen.getByTestId('operator-actions-op_c'))
    expect(
      screen.getByTestId('operator-action-reactivate-op_c'),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('operator-action-suspend-op_c'),
    ).toBeNull()
  })

  it('shows resend-invite menu item only for invited rows', () => {
    setup()
    fireEvent.click(screen.getByTestId('operator-actions-op_b'))
    expect(
      screen.getByTestId('operator-action-resend-op_b'),
    ).toBeInTheDocument()
  })

  it('clicking a row triggers onEdit', () => {
    const handlers = setup()
    const row = screen.getByTestId('operator-row-op_a')
    fireEvent.click(within(row).getByText('Ahmet Şeker'))
    expect(handlers.onEdit).toHaveBeenCalled()
  })
})
