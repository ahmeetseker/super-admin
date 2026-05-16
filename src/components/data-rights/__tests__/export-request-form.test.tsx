// Wave F21.C — ExportRequestForm vitest cases.
//
// Covers:
//   - tenant select renders TENANTS rows
//   - preview button shows the bundle filename + counts
//   - download click triggers onDownload prop and lands an audit request
//   - reset button clears the preview state

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ExportRequestForm } from '@/components/data-rights/ExportRequestForm'
import { listRequests, resetDataRightsForTests } from '@/lib/data-rights'

describe('ExportRequestForm', () => {
  afterEach(() => {
    cleanup()
    resetDataRightsForTests()
  })

  it('renders the tenant select and a preview button', () => {
    render(<ExportRequestForm />)
    expect(screen.getByTestId('export-tenant-select')).toBeInTheDocument()
    expect(screen.getByTestId('export-preview-button')).toBeInTheDocument()
  })

  it('preview button surfaces filename + counts', () => {
    render(<ExportRequestForm />)
    fireEvent.click(screen.getByTestId('export-preview-button'))
    expect(screen.getByTestId('export-preview-card')).toBeInTheDocument()
    expect(screen.getByTestId('export-filename')).toHaveTextContent(/\.json$/)
    expect(screen.getByTestId('export-count-customers')).toBeInTheDocument()
    expect(screen.getByTestId('export-count-listings')).toBeInTheDocument()
  })

  it('download button fires onDownload + writes audit request', () => {
    const onDownload = vi.fn()
    const onCommitted = vi.fn()
    render(<ExportRequestForm onDownload={onDownload} onCommitted={onCommitted} />)
    fireEvent.click(screen.getByTestId('export-preview-button'))
    fireEvent.click(screen.getByTestId('export-download-button'))
    expect(onDownload).toHaveBeenCalledTimes(1)
    expect(onCommitted).toHaveBeenCalledTimes(1)
    const history = listRequests()
    expect(history.length).toBe(1)
    expect(history[0].kind).toBe('export')
    expect(history[0].status).toBe('completed')
    expect(screen.getByTestId('export-status-completed')).toBeInTheDocument()
  })

  it('reset button clears the preview', () => {
    render(<ExportRequestForm />)
    fireEvent.click(screen.getByTestId('export-preview-button'))
    expect(screen.getByTestId('export-preview-card')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('export-reset-button'))
    expect(screen.queryByTestId('export-preview-card')).not.toBeInTheDocument()
  })

  it('changing tenant resets the preview', () => {
    render(<ExportRequestForm />)
    fireEvent.click(screen.getByTestId('export-preview-button'))
    expect(screen.getByTestId('export-preview-card')).toBeInTheDocument()
    const select = screen.getByTestId('export-tenant-select') as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.value)
    const next = options.find((v) => v !== select.value) ?? options[0]
    fireEvent.change(select, { target: { value: next } })
    expect(screen.queryByTestId('export-preview-card')).not.toBeInTheDocument()
  })
})
