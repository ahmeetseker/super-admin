// LiveRumPanel — Wave F25.B vitest. Covers:
//  - empty state when buffer is missing / malformed
//  - localStorage parse + rating badge render
//  - poll picks up newly written entries
//  - Temizle clears the buffer + state
//  - non-array / invalid shapes are filtered out

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  LiveRumPanel,
  WEB_VITALS_STORAGE_KEY,
  type LiveRumEntry,
} from '@/components/web-vitals/LiveRumPanel'

function seed(entries: unknown) {
  window.localStorage.setItem(WEB_VITALS_STORAGE_KEY, JSON.stringify(entries))
}

const SAMPLE: LiveRumEntry[] = [
  {
    name: 'LCP',
    value: 1850,
    rating: 'good',
    url: '/',
    timestamp: '2026-05-14T10:00:00.000Z',
  },
  {
    name: 'CLS',
    value: 0.32,
    rating: 'poor',
    url: '/portfolio',
    timestamp: '2026-05-14T10:01:00.000Z',
  },
  {
    name: 'INP',
    value: 260,
    rating: 'needs-improvement',
    url: '/dashboard',
    timestamp: '2026-05-14T10:02:00.000Z',
  },
]

describe('LiveRumPanel', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders empty state when localStorage has no entries', () => {
    render(<LiveRumPanel pollMs={0} />)
    expect(screen.getByTestId('live-rum-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('live-rum-list')).toBeNull()
  })

  it('renders empty state when value is not valid JSON', () => {
    window.localStorage.setItem(WEB_VITALS_STORAGE_KEY, '{not json')
    render(<LiveRumPanel pollMs={0} />)
    expect(screen.getByTestId('live-rum-empty')).toBeInTheDocument()
  })

  it('renders empty state when value is not an array', () => {
    seed({ foo: 'bar' })
    render(<LiveRumPanel pollMs={0} />)
    expect(screen.getByTestId('live-rum-empty')).toBeInTheDocument()
  })

  it('filters out malformed entries', () => {
    seed([
      ...SAMPLE,
      { name: 'BOGUS', value: 1, rating: 'good', url: '/', timestamp: '2026-05-14T10:03:00.000Z' },
      { name: 'LCP', value: 'oops', rating: 'good', url: '/', timestamp: '2026-05-14T10:04:00.000Z' },
      null,
    ])
    render(<LiveRumPanel pollMs={0} />)
    expect(screen.getAllByTestId('live-rum-row')).toHaveLength(SAMPLE.length)
  })

  it('renders all seeded entries with rating badges', () => {
    seed(SAMPLE)
    render(<LiveRumPanel pollMs={0} />)
    expect(screen.getByTestId('live-rum-list')).toBeInTheDocument()
    expect(screen.getAllByTestId('live-rum-row')).toHaveLength(3)
    expect(screen.getByTestId('live-rum-badge-good')).toBeInTheDocument()
    expect(screen.getByTestId('live-rum-badge-poor')).toBeInTheDocument()
    expect(screen.getByTestId('live-rum-badge-needs-improvement')).toBeInTheDocument()
  })

  it('filters by metric name and rating chip', () => {
    seed(SAMPLE)
    render(<LiveRumPanel pollMs={0} />)
    fireEvent.click(screen.getByTestId('live-rum-name-CLS'))
    let rows = screen.getAllByTestId('live-rum-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('CLS')

    fireEvent.click(screen.getByTestId('live-rum-name-all'))
    fireEvent.click(screen.getByTestId('live-rum-rating-poor'))
    rows = screen.getAllByTestId('live-rum-row')
    expect(rows).toHaveLength(1)
    expect(screen.getByTestId('live-rum-badge-poor')).toBeInTheDocument()
  })

  it('clears storage and state when Temizle is clicked', () => {
    seed(SAMPLE)
    render(<LiveRumPanel pollMs={0} />)
    expect(screen.getAllByTestId('live-rum-row').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByTestId('live-rum-clear'))
    expect(screen.getByTestId('live-rum-empty')).toBeInTheDocument()
    expect(window.localStorage.getItem(WEB_VITALS_STORAGE_KEY)).toBeNull()
  })

  it('polls localStorage on the configured interval', () => {
    vi.useFakeTimers()
    try {
      render(<LiveRumPanel pollMs={5000} />)
      expect(screen.getByTestId('live-rum-empty')).toBeInTheDocument()
      seed(SAMPLE)
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(screen.getAllByTestId('live-rum-row')).toHaveLength(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it('refreshes on storage events', () => {
    render(<LiveRumPanel pollMs={0} />)
    expect(screen.getByTestId('live-rum-empty')).toBeInTheDocument()
    seed(SAMPLE)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: WEB_VITALS_STORAGE_KEY }),
      )
    })
    expect(screen.getAllByTestId('live-rum-row')).toHaveLength(3)
  })
})
