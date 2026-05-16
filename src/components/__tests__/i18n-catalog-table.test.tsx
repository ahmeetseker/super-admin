// Wave F26.B — CatalogTable + MissingFilter vitest.
// Inline-edit commit on blur, Escape reverts, reset disabled w/o override,
// and MissingFilter cycles between all / missing-en / missing-tr.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import CatalogTable from '@/components/i18n/CatalogTable'
import MissingFilter from '@/components/i18n/MissingFilter'
import type { LocalizedString } from '@/lib/i18n-catalog'

const ROWS: LocalizedString[] = [
  { key: 'common.save', namespace: 'common', tr: 'Kaydet', en: 'Save', modifiedISO: '2026-05-14T00:00:00Z' },
  { key: 'common.cancel', namespace: 'common', tr: 'İptal', en: 'Cancel' },
  { key: 'auth.signIn', namespace: 'auth', tr: 'Giriş yap', en: '' },
]

describe('CatalogTable', () => {
  afterEach(() => cleanup())

  it('renders one row per entry with key + namespace + both inputs', () => {
    render(<CatalogTable rows={ROWS} onUpdate={() => {}} onReset={() => {}} />)
    expect(screen.getAllByTestId('i18n-row')).toHaveLength(3)
    expect(screen.getByTestId('i18n-cell-tr-common.save')).toBeInTheDocument()
    expect(screen.getByTestId('i18n-cell-en-common.save')).toBeInTheDocument()
  })

  it('inline edit commits on blur when value changes', () => {
    const onUpdate = vi.fn()
    render(<CatalogTable rows={ROWS} onUpdate={onUpdate} onReset={() => {}} />)
    const cell = screen.getByTestId('i18n-cell-en-common.save') as HTMLInputElement
    fireEvent.change(cell, { target: { value: 'Persist' } })
    fireEvent.blur(cell)
    expect(onUpdate).toHaveBeenCalledWith('common.save', { en: 'Persist' })
  })

  it('inline edit does NOT call onUpdate when value unchanged', () => {
    const onUpdate = vi.fn()
    render(<CatalogTable rows={ROWS} onUpdate={onUpdate} onReset={() => {}} />)
    const cell = screen.getByTestId('i18n-cell-tr-common.save') as HTMLInputElement
    fireEvent.blur(cell)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('Escape reverts the draft and skips commit', () => {
    const onUpdate = vi.fn()
    render(<CatalogTable rows={ROWS} onUpdate={onUpdate} onReset={() => {}} />)
    const cell = screen.getByTestId('i18n-cell-tr-common.save') as HTMLInputElement
    fireEvent.change(cell, { target: { value: 'değiştirildi' } })
    fireEvent.keyDown(cell, { key: 'Escape' })
    fireEvent.blur(cell)
    expect(onUpdate).not.toHaveBeenCalled()
    expect(cell.value).toBe('Kaydet')
  })

  it('Enter triggers blur which commits', () => {
    const onUpdate = vi.fn()
    render(<CatalogTable rows={ROWS} onUpdate={onUpdate} onReset={() => {}} />)
    const cell = screen.getByTestId('i18n-cell-en-common.save') as HTMLInputElement
    fireEvent.change(cell, { target: { value: 'Stored' } })
    fireEvent.keyDown(cell, { key: 'Enter' })
    fireEvent.blur(cell)
    expect(onUpdate).toHaveBeenCalledWith('common.save', { en: 'Stored' })
  })

  it('missing EN cell is flagged via data-missing', () => {
    render(<CatalogTable rows={ROWS} onUpdate={() => {}} onReset={() => {}} />)
    expect(screen.getByTestId('i18n-cell-en-auth.signIn')).toHaveAttribute(
      'data-missing',
      'true',
    )
    expect(screen.getByTestId('i18n-cell-en-common.save')).toHaveAttribute(
      'data-missing',
      'false',
    )
  })

  it('reset button is disabled when row has no override', () => {
    const onReset = vi.fn()
    render(<CatalogTable rows={ROWS} onUpdate={() => {}} onReset={onReset} />)
    const noOverrideBtn = screen.getByTestId('i18n-reset-common.cancel') as HTMLButtonElement
    expect(noOverrideBtn.disabled).toBe(true)
    fireEvent.click(noOverrideBtn)
    expect(onReset).not.toHaveBeenCalled()
  })

  it('reset button fires onReset for modified rows', () => {
    const onReset = vi.fn()
    render(<CatalogTable rows={ROWS} onUpdate={() => {}} onReset={onReset} />)
    fireEvent.click(screen.getByTestId('i18n-reset-common.save'))
    expect(onReset).toHaveBeenCalledWith('common.save')
  })

  it('empty state renders when no rows match', () => {
    render(<CatalogTable rows={[]} onUpdate={() => {}} onReset={() => {}} />)
    expect(screen.getByTestId('i18n-empty-state')).toBeInTheDocument()
  })
})

describe('MissingFilter', () => {
  afterEach(() => cleanup())

  it('renders three options with counts on EN + TR chips', () => {
    render(
      <MissingFilter
        value="all"
        onChange={() => {}}
        missingEnCount={4}
        missingTrCount={2}
      />,
    )
    expect(screen.getByTestId('i18n-missing-filter-all')).toBeInTheDocument()
    expect(screen.getByTestId('i18n-missing-filter-missing-en')).toHaveTextContent('4')
    expect(screen.getByTestId('i18n-missing-filter-missing-tr')).toHaveTextContent('2')
  })

  it('clicking a chip fires onChange with that value', () => {
    const onChange = vi.fn()
    render(
      <MissingFilter
        value="all"
        onChange={onChange}
        missingEnCount={0}
        missingTrCount={0}
      />,
    )
    fireEvent.click(screen.getByTestId('i18n-missing-filter-missing-en'))
    expect(onChange).toHaveBeenCalledWith('missing-en')
  })

  it('marks the active chip via data-active=true', () => {
    render(
      <MissingFilter
        value="missing-tr"
        onChange={() => {}}
        missingEnCount={0}
        missingTrCount={3}
      />,
    )
    expect(screen.getByTestId('i18n-missing-filter-missing-tr')).toHaveAttribute(
      'data-active',
      'true',
    )
    expect(screen.getByTestId('i18n-missing-filter-all')).toHaveAttribute(
      'data-active',
      'false',
    )
  })
})
