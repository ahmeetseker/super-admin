// Wave F21.A — OperatorFormModal unit tests.
// Drives the create + edit flows of the F21.0 operator-store via the form UI.
// vitest.setup.ts already installs an in-memory localStorage shim (F13.E),
// so we can call resetOperatorsForTests() to start from the seeded baseline.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OperatorFormModal } from '@/components/operators/OperatorFormModal'
import {
  createOperator,
  getOperators,
  resetOperatorsForTests,
} from '@/lib/operator-store'

describe('OperatorFormModal', () => {
  beforeEach(() => {
    resetOperatorsForTests()
  })

  afterEach(() => cleanup())

  it('renders nothing when open=false', () => {
    render(
      <OperatorFormModal open={false} initial={null} onClose={() => {}} onSaved={() => {}} />,
    )
    expect(screen.queryByTestId('operator-form-modal')).toBeNull()
  })

  it('blocks submit when the e-mail is empty', () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(
      <OperatorFormModal open initial={null} onClose={onClose} onSaved={onSaved} />,
    )
    fireEvent.click(screen.getByTestId('operator-form-submit'))
    expect(screen.getByTestId('operator-form-error').textContent).toContain('E-posta zorunlu')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('blocks submit when the e-mail is malformed', () => {
    const onSaved = vi.fn()
    render(
      <OperatorFormModal open initial={null} onClose={() => {}} onSaved={onSaved} />,
    )
    // jsdom strips obviously invalid values from `<input type="email">`. Use a
    // string with `@` but no TLD so the value sticks and our regex catches it.
    fireEvent.change(screen.getByTestId('operator-email-input'), {
      target: { value: 'no-tld@x' },
    })
    fireEvent.click(screen.getByTestId('operator-form-submit'))
    expect(screen.getByTestId('operator-form-error').textContent).toContain('Geçerli')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('creates a new operator on submit and calls onSaved + onClose', () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(
      <OperatorFormModal open initial={null} onClose={onClose} onSaved={onSaved} />,
    )
    fireEvent.change(screen.getByTestId('operator-email-input'), {
      target: { value: 'yeni.kullanici@turksab.com' },
    })
    fireEvent.change(screen.getByTestId('operator-role-select'), {
      target: { value: 'compliance' },
    })
    fireEvent.click(screen.getByTestId('operator-form-submit'))

    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    const saved = getOperators().find(
      (o) => o.email === 'yeni.kullanici@turksab.com',
    )
    expect(saved).toBeDefined()
    expect(saved!.roleId).toBe('compliance')
    expect(saved!.status).toBe('invited')
  })

  it('rejects duplicate e-mail with an inline error', () => {
    createOperator({ email: 'dupe@turksab.com', roleId: 'support' })
    const onSaved = vi.fn()
    render(
      <OperatorFormModal open initial={null} onClose={() => {}} onSaved={onSaved} />,
    )
    fireEvent.change(screen.getByTestId('operator-email-input'), {
      target: { value: 'dupe@turksab.com' },
    })
    fireEvent.click(screen.getByTestId('operator-form-submit'))
    expect(screen.getByTestId('operator-form-error').textContent).toContain('zaten')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('edits an existing operator (name + role) and persists via updateOperator', () => {
    const created = createOperator({ email: 'edit-me@turksab.com', roleId: 'support' })
    const onSaved = vi.fn()
    render(
      <OperatorFormModal
        open
        initial={created}
        onClose={() => {}}
        onSaved={onSaved}
      />,
    )
    fireEvent.change(screen.getByTestId('operator-name-input'), {
      target: { value: 'Yeni İsim' },
    })
    fireEvent.change(screen.getByTestId('operator-role-select'), {
      target: { value: 'billing-ops' },
    })
    fireEvent.click(screen.getByTestId('operator-form-submit'))

    expect(onSaved).toHaveBeenCalledTimes(1)
    const after = getOperators().find((o) => o.id === created.id)!
    expect(after.name).toBe('Yeni İsim')
    expect(after.roleId).toBe('billing-ops')
  })
})
