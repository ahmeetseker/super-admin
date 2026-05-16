/**
 * Client-side file download via Blob URL.
 * Used by audit log + future export features (tenants, transactions, etc.).
 */

export function downloadJson(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  triggerDownload(filename, blob)
}

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: Array<keyof T>,
): void {
  if (rows.length === 0) {
    triggerDownload(filename, new Blob([''], { type: 'text/csv;charset=utf-8' }))
    return
  }
  const cols = columns ?? (Object.keys(rows[0]) as Array<keyof T>)
  const header = cols.map((c) => csvEscape(String(c))).join(',')
  const body = rows
    .map((row) => cols.map((c) => csvEscape(formatCellValue(row[c]))).join(','))
    .join('\n')
  const csv = '﻿' + header + '\n' + body // BOM for Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  triggerDownload(filename, blob)
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

function formatCellValue(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toISOString()
  // Nested objects → JSON string in cell (for metadata)
  return JSON.stringify(v)
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a tick to ensure download started
  window.setTimeout(() => URL.revokeObjectURL(url), 100)
}
