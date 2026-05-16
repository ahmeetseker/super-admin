// Wave F26.A — CreateFlagModal vitest.
// Validates key pattern, blocks submit when invalid, persists new flag.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CreateFlagModal } from '@/components/feature-flags/CreateFlagModal'
import {
  createFeatureFlag,
  getFeatureFlags,
  resetFeatureFlagsForTests,
} from '@/lib/feature-flags'

describe('CreateFlagModal', () => {
  beforeEach(() => {
    resetFeatureFlagsForTests()
  })
  afterEach(() => {
    cleanup()
    resetFeatureFlagsForTests()
  })

  it('does not render when closed', () => {
    render(<CreateFlagModal open={false} onClose={() => {}} onCreated={() => {}} />)
    expect(screen.queryByTestId('create-flag-modal')).toBeNull()
  })

  it('submit button disabled until key + name valid', () => {
    render(<CreateFlagModal open={true} onClose={() => {}} onCreated={() => {}} />)
    const submit = screen.getByTestId('create-flag-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('flag-key-input'), {
      target: { value: 'X' }, // too short
    })
    expect(submit.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('flag-key-input'), {
      target: { value: 'new-thing' },
    })
    fireEvent.change(screen.getByTestId('flag-name-input'), {
      target: { value: 'Yeni özellik' },
    })
    expect(submit.disabled).toBe(false)
  })

  it('persists a new flag on submit + calls callbacks', () => {
    const onCreated = vi.fn()
    const onClose = vi.fn()
    render(<CreateFlagModal open={true} onClose={onClose} onCreated={onCreated} />)
    fireEvent.change(screen.getByTestId('flag-key-input'), {
      target: { value: 'shiny-button' },
    })
    fireEvent.change(screen.getByTestId('flag-name-input'), {
      target: { value: 'Parlak buton' },
    })
    fireEvent.change(screen.getByTestId('flag-tags-input'), {
      target: { value: 'ui, marketing' },
    })
    fireEvent.click(screen.getByTestId('create-flag-submit'))

    const fresh = getFeatureFlags().find((f) => f.key === 'shiny-button')
    expect(fresh).toBeDefined()
    expect(fresh!.name).toBe('Parlak buton')
    expect(fresh!.tags).toEqual(['ui', 'marketing'])
    expect(fresh!.enabled).toBe(false)
    expect(onCreated).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows error when key collides with existing flag', () => {
    createFeatureFlag({ key: 'dup-key', name: 'Existing' })
    const onCreated = vi.fn()
    const onClose = vi.fn()
    render(<CreateFlagModal open={true} onClose={onClose} onCreated={onCreated} />)
    fireEvent.change(screen.getByTestId('flag-key-input'), {
      target: { value: 'dup-key' },
    })
    fireEvent.change(screen.getByTestId('flag-name-input'), {
      target: { value: 'Çakışan' },
    })
    fireEvent.click(screen.getByTestId('create-flag-submit'))

    expect(screen.getByTestId('create-flag-error')).toBeInTheDocument()
    expect(onCreated).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('environment chip toggles add/remove env from selection', () => {
    render(<CreateFlagModal open={true} onClose={() => {}} onCreated={() => {}} />)
    fireEvent.change(screen.getByTestId('flag-key-input'), {
      target: { value: 'env-toggle' },
    })
    fireEvent.change(screen.getByTestId('flag-name-input'), {
      target: { value: 'Env toggle' },
    })
    // Add production + preview (development is default-on).
    fireEvent.click(screen.getByTestId('flag-env-production'))
    fireEvent.click(screen.getByTestId('flag-env-preview'))
    fireEvent.click(screen.getByTestId('create-flag-submit'))

    const fresh = getFeatureFlags().find((f) => f.key === 'env-toggle')
    expect(fresh).toBeDefined()
    expect(fresh!.environments.sort()).toEqual(['development', 'preview', 'production'])
  })
})
