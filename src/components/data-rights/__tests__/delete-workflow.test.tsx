// Wave F21.C — DeleteWorkflow vitest cases.
//
// Verifies the 4-step state machine:
//   - collapsed → preview after "Silme talebi başlat"
//   - preview → confirm after "Devam et"
//   - confirm gate: type-to-confirm enforces "SİL <tenant.name>" exact match
//   - countdown ticks 3→2→1→done with fake timers and lands a delete request
//   - Vazgeç during countdown returns to preview and does NOT commit
//
// Uses fake timers so the setInterval tick is deterministic. countdownSeconds
// is left at the default (3) to mirror the real UI.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TENANTS } from '@landx/data'
import { DeleteWorkflow } from '@/components/data-rights/DeleteWorkflow'
import { listRequests, resetDataRightsForTests } from '@/lib/data-rights'

const FIRST_TENANT = TENANTS[0]
const EXPECTED_PHRASE = `SİL ${FIRST_TENANT.name}`

describe('DeleteWorkflow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    resetDataRightsForTests()
  })

  it('starts collapsed and opens on the start button', () => {
    render(<DeleteWorkflow />)
    expect(screen.getByTestId('delete-workflow-collapsed')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('delete-workflow-start'))
    expect(screen.getByTestId('delete-workflow')).toBeInTheDocument()
    expect(screen.getByTestId('delete-step-preview')).toBeInTheDocument()
  })

  it('preview → confirm transition shows the cascade preview', () => {
    render(<DeleteWorkflow />)
    fireEvent.click(screen.getByTestId('delete-workflow-start'))
    expect(screen.getByTestId('cascade-preview-card')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('delete-step-preview-next'))
    expect(screen.getByTestId('delete-step-confirm')).toBeInTheDocument()
  })

  it('confirm step disables the next button until the phrase matches exactly', () => {
    render(<DeleteWorkflow />)
    fireEvent.click(screen.getByTestId('delete-workflow-start'))
    fireEvent.click(screen.getByTestId('delete-step-preview-next'))
    const next = screen.getByTestId('delete-step-confirm-next') as HTMLButtonElement
    expect(next.disabled).toBe(true)
    const input = screen.getByTestId('delete-confirm-input') as HTMLInputElement
    // Wrong case — must remain disabled (case-sensitive)
    fireEvent.change(input, { target: { value: EXPECTED_PHRASE.toLowerCase() } })
    expect(next.disabled).toBe(true)
    // Correct phrase
    fireEvent.change(input, { target: { value: EXPECTED_PHRASE } })
    expect(next.disabled).toBe(false)
  })

  it('countdown ticks 3→2→1→done and commits a delete request', () => {
    const onCompleted = vi.fn()
    render(<DeleteWorkflow countdownSeconds={3} tickMs={1000} onCompleted={onCompleted} />)
    fireEvent.click(screen.getByTestId('delete-workflow-start'))
    fireEvent.click(screen.getByTestId('delete-step-preview-next'))
    fireEvent.change(screen.getByTestId('delete-confirm-input'), {
      target: { value: EXPECTED_PHRASE },
    })
    fireEvent.click(screen.getByTestId('delete-step-confirm-next'))
    expect(screen.getByTestId('delete-step-countdown')).toBeInTheDocument()
    expect(screen.getByTestId('delete-countdown-display').getAttribute('data-counter')).toBe('3')
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByTestId('delete-countdown-display').getAttribute('data-counter')).toBe('2')
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByTestId('delete-countdown-display').getAttribute('data-counter')).toBe('1')
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    // counter reached 0 → effect fires → step becomes 'done'
    expect(screen.getByTestId('delete-step-done')).toBeInTheDocument()
    expect(screen.getByTestId('delete-success-banner')).toBeInTheDocument()
    expect(onCompleted).toHaveBeenCalledTimes(1)
    const history = listRequests()
    expect(history.length).toBe(1)
    expect(history[0].kind).toBe('delete')
    expect(history[0].status).toBe('completed')
  })

  it('cancel during countdown returns to preview and does NOT commit', () => {
    render(<DeleteWorkflow countdownSeconds={3} tickMs={1000} />)
    fireEvent.click(screen.getByTestId('delete-workflow-start'))
    fireEvent.click(screen.getByTestId('delete-step-preview-next'))
    fireEvent.change(screen.getByTestId('delete-confirm-input'), {
      target: { value: EXPECTED_PHRASE },
    })
    fireEvent.click(screen.getByTestId('delete-step-confirm-next'))
    expect(screen.getByTestId('delete-step-countdown')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    fireEvent.click(screen.getByTestId('delete-step-countdown-cancel'))
    expect(screen.getByTestId('delete-step-preview')).toBeInTheDocument()
    // No request landed
    expect(listRequests().length).toBe(0)
  })

  it('done close button collapses the workflow', () => {
    render(<DeleteWorkflow countdownSeconds={1} tickMs={500} />)
    fireEvent.click(screen.getByTestId('delete-workflow-start'))
    fireEvent.click(screen.getByTestId('delete-step-preview-next'))
    fireEvent.change(screen.getByTestId('delete-confirm-input'), {
      target: { value: EXPECTED_PHRASE },
    })
    fireEvent.click(screen.getByTestId('delete-step-confirm-next'))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByTestId('delete-step-done')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('delete-step-done-close'))
    expect(screen.getByTestId('delete-workflow-collapsed')).toBeInTheDocument()
  })
})
