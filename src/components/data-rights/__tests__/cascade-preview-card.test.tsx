// Wave F21.C — CascadePreviewCard vitest cases.
//
// Verifies all six metric tiles render and the KVKK warning banner is
// present. Numbers are passed in directly so this test is independent of
// `previewCascade` lib output.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CascadePreviewCard } from '@/components/data-rights/CascadePreviewCard'
import type { CascadePreview } from '@/lib/data-rights'

const PREVIEW: CascadePreview = {
  tenant: { id: 't-x', name: 'Tenant X' },
  customers: 1234,
  listings: 56,
  transactions: 78,
  auditEntries: 9,
  storageMb: 42,
  dbRows: 99999,
}

describe('CascadePreviewCard', () => {
  afterEach(() => cleanup())

  it('renders the tenant name and id', () => {
    render(<CascadePreviewCard preview={PREVIEW} />)
    expect(screen.getByText('Tenant X')).toBeInTheDocument()
    expect(screen.getByText(/t-x/)).toBeInTheDocument()
  })

  it('renders all six metric tiles', () => {
    render(<CascadePreviewCard preview={PREVIEW} />)
    expect(screen.getByTestId('cascade-metric-customers')).toBeInTheDocument()
    expect(screen.getByTestId('cascade-metric-listings')).toBeInTheDocument()
    expect(screen.getByTestId('cascade-metric-transactions')).toBeInTheDocument()
    expect(screen.getByTestId('cascade-metric-audit')).toBeInTheDocument()
    expect(screen.getByTestId('cascade-metric-storage')).toBeInTheDocument()
    expect(screen.getByTestId('cascade-metric-db')).toBeInTheDocument()
  })

  it('formats numbers using tr-TR thousands separator', () => {
    render(<CascadePreviewCard preview={PREVIEW} />)
    expect(screen.getByTestId('cascade-value-customers')).toHaveTextContent('1.234')
    expect(screen.getByTestId('cascade-value-db')).toHaveTextContent('99.999')
  })

  it('surfaces the KVKK audit warning', () => {
    render(<CascadePreviewCard preview={PREVIEW} />)
    expect(screen.getByTestId('cascade-kvkk-warning')).toBeInTheDocument()
    expect(screen.getByTestId('cascade-kvkk-warning')).toHaveTextContent(/KVKK/)
  })
})
