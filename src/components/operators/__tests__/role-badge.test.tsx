// Wave F21.A — RoleBadge unit tests.
// Confirms the spec-mandated tint table and the getRoleLabel hookup.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import {
  RoleBadge,
  ROLE_BADGE_TONE,
} from '@/components/operators/RoleBadge'

describe('RoleBadge', () => {
  afterEach(() => cleanup())

  it('uses the spec rose tint for super-admin', () => {
    render(<RoleBadge roleId="super-admin" />)
    const el = screen.getByTestId('role-badge-super-admin')
    expect(el.className).toContain('bg-rose-500/10')
    expect(el.textContent).toContain('Süper Admin')
  })

  it('uses the spec sky tint for support', () => {
    expect(ROLE_BADGE_TONE.support).toContain('bg-sky-500/10')
  })

  it('uses the spec emerald tint for billing-ops', () => {
    expect(ROLE_BADGE_TONE['billing-ops']).toContain('bg-emerald-500/10')
  })

  it('uses the spec amber tint for compliance', () => {
    expect(ROLE_BADGE_TONE.compliance).toContain('bg-amber-500/10')
  })

  it('uses the spec stone tint for readonly-auditor', () => {
    expect(ROLE_BADGE_TONE['readonly-auditor']).toContain('bg-stone-500/10')
  })
})
