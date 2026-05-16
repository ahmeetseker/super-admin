// Wave F21.B — TwoFaPolicyPanel vitest.
// Toggle bir rolün zorunluluk durumunu setTwoFaPolicy'e yansıtmalı ve
// görsel state ("Zorunlu"/"Opsiyonel") güncellenmeli.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { TwoFaPolicyPanel } from '@/components/security/TwoFaPolicyPanel'
import { getTwoFaPolicy, resetAllowlistForTests } from '@/lib/ip-allowlist'
import { ROLES } from '@landx/data'

describe('TwoFaPolicyPanel', () => {
  beforeEach(() => {
    resetAllowlistForTests()
  })

  afterEach(() => {
    cleanup()
    resetAllowlistForTests()
  })

  it('renders one row per ROLES entry', () => {
    render(<TwoFaPolicyPanel />)
    const rows = screen.getAllByTestId('twofa-policy-row')
    expect(rows).toHaveLength(ROLES.length)
  })

  it('toggles a role policy + persists via setTwoFaPolicy', () => {
    render(<TwoFaPolicyPanel />)
    const target = ROLES[0]
    const row = screen
      .getAllByTestId('twofa-policy-row')
      .find((r) => r.getAttribute('data-role-id') === target.id)!
    const toggle = within(row).getByTestId('twofa-policy-toggle')

    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(within(row).getByTestId('twofa-policy-state')).toHaveTextContent(
      'Opsiyonel',
    )

    fireEvent.click(toggle)

    expect(getTwoFaPolicy()[target.id]).toBe(true)
    const refreshedRow = screen
      .getAllByTestId('twofa-policy-row')
      .find((r) => r.getAttribute('data-role-id') === target.id)!
    expect(
      within(refreshedRow).getByTestId('twofa-policy-toggle').getAttribute(
        'aria-checked',
      ),
    ).toBe('true')
    expect(
      within(refreshedRow).getByTestId('twofa-policy-state'),
    ).toHaveTextContent('Zorunlu')

    fireEvent.click(within(refreshedRow).getByTestId('twofa-policy-toggle'))
    expect(getTwoFaPolicy()[target.id]).toBe(false)
  })
})
