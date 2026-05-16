// Wave F13.B — BulkActionsBar vitest cases.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BulkActionsBar } from '@/components/tenants/BulkActionsBar'

describe('BulkActionsBar', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  })
  afterEach(() => cleanup())

  it('renders nothing when count is 0', () => {
    const { container } = render(<BulkActionsBar count={0} onClear={() => {}} actions={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows count badge + action buttons', () => {
    const onClick = vi.fn()
    render(
      <BulkActionsBar
        count={3}
        onClear={() => {}}
        actions={[
          { id: 'plan', label: 'Toplu plan değiştir', onClick },
          { id: 'sus', label: 'Toplu askıya al', onClick: () => {}, tone: 'destructive' },
        ]}
      />,
    )
    expect(screen.getByTestId('bulk-count').textContent).toBe('3')
    expect(screen.getByTestId('bulk-action-plan')).toBeInTheDocument()
    expect(screen.getByTestId('bulk-action-sus')).toBeInTheDocument()
  })

  it('invokes action onClick when button is pressed', () => {
    const onClick = vi.fn()
    render(
      <BulkActionsBar
        count={2}
        onClear={() => {}}
        actions={[{ id: 'plan', label: 'X', onClick }]}
      />,
    )
    fireEvent.click(screen.getByTestId('bulk-action-plan'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('invokes onClear via the X button', () => {
    const onClear = vi.fn()
    render(<BulkActionsBar count={1} onClear={onClear} actions={[]} />)
    fireEvent.click(screen.getByTestId('bulk-clear'))
    expect(onClear).toHaveBeenCalled()
  })
})
