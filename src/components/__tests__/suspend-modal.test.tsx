// Wave F13.B — SuspendModal vitest cases.
// Verifies the type-to-confirm gate + the localStorage override surface.
// F17.B: dropped inline installMemoryStorage shim — shared vitest.setup.ts
// (F13.E) already installs an InMemoryStorage instance before each test.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import {
  SuspendModal,
  TENANT_STATUS_OVERRIDE_KEY,
  getSuspendedTenantIds,
  suspendTenants,
} from '@/components/tenant/SuspendModal'

describe('SuspendModal', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the single-tenant headline + confirm input', () => {
    render(
      <SuspendModal
        tenantIds={['tnt-acme']}
        tenantLabel="Acme Emlak"
        onClose={() => {}}
      />,
    )
    expect(screen.getByText(/Acme Emlak askıya alınacak/)).toBeInTheDocument()
    expect(screen.getByTestId('suspend-confirm-input')).toBeInTheDocument()
  })

  it('shows "N hesap" bulk headline when multiple ids passed', () => {
    render(
      <SuspendModal
        tenantIds={['tnt-a', 'tnt-b', 'tnt-c']}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText(/3 hesap askıya alınacak/)).toBeInTheDocument()
  })

  it('keeps submit disabled until the user types SUSPEND verbatim', () => {
    render(
      <SuspendModal
        tenantIds={['tnt-acme']}
        tenantLabel="Acme"
        onClose={() => {}}
      />,
    )
    const submit = screen.getByTestId('suspend-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('suspend-confirm-input'), { target: { value: 'suspend' } })
    expect(submit.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('suspend-confirm-input'), { target: { value: 'SUSPEND' } })
    expect(submit.disabled).toBe(false)
  })

  it('writes status overrides + calls onSuspended on submit', () => {
    const onSuspended = vi.fn()
    const onClose = vi.fn()
    render(
      <SuspendModal
        tenantIds={['tnt-acme', 'tnt-other']}
        onClose={onClose}
        onSuspended={onSuspended}
      />,
    )
    fireEvent.change(screen.getByTestId('suspend-confirm-input'), { target: { value: 'SUSPEND' } })
    fireEvent.click(screen.getByTestId('suspend-submit'))

    expect(onSuspended).toHaveBeenCalledWith(['tnt-acme', 'tnt-other'])
    expect(onClose).toHaveBeenCalled()

    const stored = JSON.parse(window.localStorage.getItem(TENANT_STATUS_OVERRIDE_KEY)!) as Record<
      string,
      { status: string }
    >
    expect(stored['tnt-acme'].status).toBe('suspended')
    expect(stored['tnt-other'].status).toBe('suspended')
  })

  it('suspendTenants() + getSuspendedTenantIds() round-trip', () => {
    suspendTenants(['tnt-1', 'tnt-2'])
    const list = getSuspendedTenantIds()
    expect(list.sort()).toEqual(['tnt-1', 'tnt-2'])
  })

  it('Escape key invokes onClose', () => {
    const onClose = vi.fn()
    render(
      <SuspendModal tenantIds={['tnt-acme']} onClose={onClose} />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
