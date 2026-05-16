// Wave F21.B — TwoFaEnforcementCard vitest.
// Coverage stats render (operator-store seed'inden derive) ve eksik
// operatörler liste/empty state.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { TwoFaEnforcementCard } from '@/components/security/TwoFaEnforcementCard'
import {
  get2faCoverage,
  getOperators,
  resetOperatorsForTests,
  updateOperator,
} from '@/lib/operator-store'

describe('TwoFaEnforcementCard', () => {
  beforeEach(() => {
    resetOperatorsForTests()
  })

  afterEach(() => {
    cleanup()
    resetOperatorsForTests()
  })

  it('renders enrolled / missing / rate stats from operator-store seed', () => {
    const coverage = get2faCoverage()
    render(<TwoFaEnforcementCard />)
    expect(screen.getByTestId('twofa-stat-enrolled')).toHaveTextContent(
      String(coverage.enrolled),
    )
    expect(screen.getByTestId('twofa-stat-missing')).toHaveTextContent(
      String(coverage.missing),
    )
    expect(screen.getByTestId('twofa-stat-rate')).toHaveTextContent(
      `${coverage.rate}%`,
    )
  })

  it('lists every operator without 2FA enroll', () => {
    render(<TwoFaEnforcementCard />)
    const expectedMissing = getOperators().filter((o) => !o.twofaEnrolled).length
    if (expectedMissing === 0) {
      expect(screen.getByTestId('twofa-missing-empty')).toBeInTheDocument()
    } else {
      expect(screen.getAllByTestId('twofa-missing-row')).toHaveLength(
        expectedMissing,
      )
    }
  })

  it('shows empty state when all operators are enrolled', () => {
    for (const op of getOperators()) {
      if (!op.twofaEnrolled) updateOperator(op.id, { twofaEnrolled: true })
    }
    render(<TwoFaEnforcementCard refreshKey={1} />)
    expect(screen.getByTestId('twofa-missing-empty')).toBeInTheDocument()
  })
})
