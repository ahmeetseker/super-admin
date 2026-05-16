// Wave F21.B — AddCidrModal vitest.
// Invalid CIDR → submit disabled + inline error. Valid CIDR → size preview +
// addAllowEntry persistence + onAdded callback.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AddCidrModal } from '@/components/security/AddCidrModal'
import { listAllowEntries, resetAllowlistForTests } from '@/lib/ip-allowlist'
import { TENANTS } from '@landx/data'

const TENANT = TENANTS[0]

describe('AddCidrModal', () => {
  beforeEach(() => {
    resetAllowlistForTests()
  })

  afterEach(() => {
    cleanup()
    resetAllowlistForTests()
  })

  it('submit disabled until a valid CIDR is entered', () => {
    render(<AddCidrModal tenant={TENANT} onClose={() => {}} />)
    const submit = screen.getByTestId('add-cidr-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('add-cidr-input'), {
      target: { value: 'garbage' },
    })
    expect(submit.disabled).toBe(true)
    expect(screen.getByTestId('add-cidr-invalid')).toBeInTheDocument()
  })

  it('shows a live size preview for valid CIDR input', () => {
    render(<AddCidrModal tenant={TENANT} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('add-cidr-input'), {
      target: { value: '10.0.0.0/24' },
    })
    expect(screen.getByTestId('add-cidr-size')).toHaveTextContent('256 IP')
    expect((screen.getByTestId('add-cidr-submit') as HTMLButtonElement).disabled)
      .toBe(false)
  })

  it('persists a valid CIDR via addAllowEntry on submit', () => {
    const onClose = vi.fn()
    const onAdded = vi.fn()
    render(
      <AddCidrModal tenant={TENANT} onClose={onClose} onAdded={onAdded} />,
    )
    fireEvent.change(screen.getByTestId('add-cidr-input'), {
      target: { value: '10.0.0.0/24' },
    })
    fireEvent.change(screen.getByTestId('add-cidr-label'), {
      target: { value: 'Ofis IP' },
    })
    fireEvent.click(screen.getByTestId('add-cidr-submit'))

    const entries = listAllowEntries(TENANT.id)
    expect(entries).toHaveLength(1)
    expect(entries[0].cidr).toBe('10.0.0.0/24')
    expect(entries[0].label).toBe('Ofis IP')
    expect(onAdded).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
