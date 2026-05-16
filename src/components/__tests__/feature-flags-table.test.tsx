// Wave F26.A — FeatureFlagsTable vitest.
// Renders rows from the F26.0 seed, exercises search + tag filter + toggle.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { FeatureFlagsTable } from '@/components/feature-flags/FeatureFlagsTable'
import {
  createFeatureFlag,
  getFeatureFlags,
  resetFeatureFlagsForTests,
} from '@/lib/feature-flags'

function renderWithRefresh() {
  const onChange = vi.fn()
  // Seed reads + persists on first call.
  const initial = getFeatureFlags()
  const utils = render(<FeatureFlagsTable flags={initial} onChange={onChange} />)
  return { ...utils, onChange }
}

describe('FeatureFlagsTable', () => {
  beforeEach(() => {
    resetFeatureFlagsForTests()
  })
  afterEach(() => {
    cleanup()
    resetFeatureFlagsForTests()
  })

  it('renders one row per seeded flag', () => {
    renderWithRefresh()
    const rows = screen.getAllByTestId('feature-flag-row')
    expect(rows.length).toBe(8)
  })

  it('search input narrows visible rows', () => {
    renderWithRefresh()
    const input = screen.getByTestId('feature-flags-search') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'dark' } })
    const rows = screen.getAllByTestId('feature-flag-row')
    expect(rows.length).toBe(1)
    expect(rows[0]).toHaveAttribute('data-flag-key', 'dark-mode')
  })

  it('tag chip filter narrows rows to matching tag', () => {
    renderWithRefresh()
    const chip = screen.getByTestId('tag-filter-ui')
    fireEvent.click(chip)
    const rows = screen.getAllByTestId('feature-flag-row')
    // Seed has two flags tagged "ui": command-palette-v2 + dark-mode.
    expect(rows.length).toBe(2)
  })

  it('env filter excludes flags without that environment', () => {
    renderWithRefresh()
    fireEvent.click(screen.getByTestId('env-filter-production'))
    const rows = screen.getAllByTestId('feature-flag-row')
    const keys = rows.map((r) => r.getAttribute('data-flag-key'))
    // realtime-messaging has environments=[] → excluded.
    expect(keys).not.toContain('realtime-messaging')
    // ip-allowlist-enforcement only in dev → excluded.
    expect(keys).not.toContain('ip-allowlist-enforcement')
  })

  it('toggle button flips the persisted enabled flag', () => {
    const { onChange } = renderWithRefresh()
    const realtime = getFeatureFlags().find((f) => f.key === 'realtime-messaging')!
    expect(realtime.enabled).toBe(false)
    const toggleBtn = screen.getByTestId(`toggle-${realtime.id}`)
    fireEvent.click(toggleBtn)
    expect(onChange).toHaveBeenCalledTimes(1)
    const after = getFeatureFlags().find((f) => f.id === realtime.id)
    expect(after?.enabled).toBe(true)
  })

  it('empty state appears when no flags match query', () => {
    renderWithRefresh()
    fireEvent.change(screen.getByTestId('feature-flags-search'), {
      target: { value: 'zzzz-no-match' },
    })
    expect(screen.getByTestId('feature-flags-empty')).toBeInTheDocument()
  })

  it('rollout slider updates persisted percentage', () => {
    createFeatureFlag({ key: 'rollout-test', name: 'Rollout test', rolloutPct: 10 })
    const flags = getFeatureFlags()
    render(<FeatureFlagsTable flags={flags} onChange={() => {}} />)
    const row = screen.getByText('rollout-test').closest('tr')!
    const slider = within(row).getByRole('slider') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '60' } })
    const after = getFeatureFlags().find((f) => f.key === 'rollout-test')
    expect(after?.rolloutPct).toBe(60)
  })
})
