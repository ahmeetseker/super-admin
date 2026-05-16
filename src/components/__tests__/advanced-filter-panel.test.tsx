// Wave F13.B — AdvancedFilterPanel vitest cases.
// Verifies toggle open/close, actor input wiring, severity chip toggling, and
// the 300ms debounce on full-text propagation.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  AdvancedFilterPanel,
  type AdvancedFilterValue,
} from '@/components/audit/AdvancedFilterPanel'
import { createPresetRange } from '@/lib/super-admin-time-range'

function Harness({
  onValue,
  initial,
}: {
  onValue?: (v: AdvancedFilterValue) => void
  initial?: Partial<AdvancedFilterValue>
}) {
  const [value, setValue] = useState<AdvancedFilterValue>(() => ({
    actor: '',
    severities: [],
    range: createPresetRange('30d'),
    fullText: '',
    ...initial,
  }))
  return (
    <AdvancedFilterPanel
      value={value}
      onChange={(next) => {
        setValue(next)
        onValue?.(next)
      }}
      actorOptions={['super@arsam.local', 'system', 'arsam-bot']}
      defaultOpen
    />
  )
}

describe('AdvancedFilterPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('renders the actor/severity/range/full-text fields when open', () => {
    render(<Harness />)
    expect(screen.getByTestId('audit-advanced-actor-input')).toBeInTheDocument()
    expect(screen.getByTestId('audit-advanced-fulltext-input')).toBeInTheDocument()
    expect(screen.getByTestId('audit-advanced-severity-info')).toBeInTheDocument()
    expect(screen.getByTestId('audit-advanced-severity-warn')).toBeInTheDocument()
    expect(screen.getByTestId('audit-advanced-severity-error')).toBeInTheDocument()
  })

  it('propagates actor changes immediately', () => {
    const captured = vi.fn()
    render(<Harness onValue={captured} />)
    fireEvent.change(screen.getByTestId('audit-advanced-actor-input'), {
      target: { value: 'super@arsam.local' },
    })
    expect(captured).toHaveBeenCalled()
    const last = captured.mock.calls.at(-1)![0] as AdvancedFilterValue
    expect(last.actor).toBe('super@arsam.local')
  })

  it('toggles severities via chip group', () => {
    const captured = vi.fn()
    render(<Harness onValue={captured} />)
    fireEvent.click(screen.getByTestId('audit-advanced-severity-error'))
    const last = captured.mock.calls.at(-1)![0] as AdvancedFilterValue
    expect(last.severities).toEqual(['error'])
  })

  it('debounces full-text by ~300ms', () => {
    const captured = vi.fn()
    render(<Harness onValue={captured} />)
    fireEvent.change(screen.getByTestId('audit-advanced-fulltext-input'), {
      target: { value: 'login' },
    })
    // Pre-flush: nothing yet (debounced)
    expect(captured).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(310)
    })
    expect(captured).toHaveBeenCalledTimes(1)
    const last = captured.mock.calls.at(-1)![0] as AdvancedFilterValue
    expect(last.fullText).toBe('login')
  })

  it('shows the active-count badge on the toggle button when filters apply', () => {
    render(<Harness initial={{ actor: 'system', severities: ['warn'], fullText: 'x' }} />)
    expect(screen.getByTestId('audit-advanced-toggle')).toHaveTextContent('3')
  })
})
