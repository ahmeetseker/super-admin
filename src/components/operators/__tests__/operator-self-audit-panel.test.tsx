// Wave F21.A — OperatorSelfAuditPanel unit tests.
// AUDIT_LOG is curated demo data — we know it has rows for ahmet@turksab.com
// and destek@turksab.com. The filter must be email-scoped.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { OperatorSelfAuditPanel } from '@/components/operators/OperatorSelfAuditPanel'
import { AUDIT_LOG } from '@landx/data'

describe('OperatorSelfAuditPanel', () => {
  afterEach(() => cleanup())

  it('renders the empty-state when no email is supplied', () => {
    render(<OperatorSelfAuditPanel currentUserEmail={null} />)
    expect(screen.getByTestId('operator-self-audit-empty')).toBeInTheDocument()
  })

  it('filters AUDIT_LOG entries by actor email', () => {
    render(<OperatorSelfAuditPanel currentUserEmail="ahmet@turksab.com" />)
    const expected = AUDIT_LOG.filter(
      (e) => e.actor.toLowerCase() === 'ahmet@turksab.com',
    )
    expect(expected.length).toBeGreaterThan(0)
    for (const e of expected) {
      expect(screen.getByTestId(`self-audit-entry-${e.id}`)).toBeInTheDocument()
    }
    // Should not show entries for other actors.
    const otherActor = AUDIT_LOG.find(
      (e) => e.actor !== 'ahmet@turksab.com' && e.actor.includes('@'),
    )
    if (otherActor) {
      expect(screen.queryByTestId(`self-audit-entry-${otherActor.id}`)).toBeNull()
    }
  })

  it('caps the entries to the supplied limit', () => {
    render(
      <OperatorSelfAuditPanel
        currentUserEmail="ahmet@turksab.com"
        limit={1}
      />,
    )
    const rendered = screen.getAllByTestId(/^self-audit-entry-/)
    expect(rendered.length).toBe(1)
  })

  it('shows empty-state when the actor has no audit rows', () => {
    render(
      <OperatorSelfAuditPanel currentUserEmail="nobody-here@turksab.com" />,
    )
    expect(screen.getByTestId('operator-self-audit-empty')).toBeInTheDocument()
  })
})
