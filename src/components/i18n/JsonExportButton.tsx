// Wave F26.B — /i18n JSON export button.
// Wraps exportCatalogJson() (F26.0) and triggers a browser download with a
// dated filename. Decoupled from the table so it can move into a toolbar.

import { useCallback } from 'react'
import { Download } from '@landx/icons'
import { exportCatalogJson } from '@/lib/i18n-catalog'

export interface JsonExportButtonProps {
  filename?: string
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function JsonExportButton({ filename }: JsonExportButtonProps) {
  const handleClick = useCallback(() => {
    const json = exportCatalogJson()
    const name = filename ?? `i18n-catalog-${todayStamp()}.json`
    if (typeof document === 'undefined') return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [filename])

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="i18n-json-export"
      className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90"
    >
      <Download className="h-3.5 w-3.5" />
      JSON export
    </button>
  )
}
