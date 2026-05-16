// Shared CSV + PNG export helpers for F12 AI/observability panels.
// CSV: UTF-8 BOM for Excel; PNG: SVG → Canvas → data URL anchor.

export interface CsvColumn<T> {
  key: string
  label: string
  getValue?: (row: T) => unknown
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => `"${c.label}"`).join(',')
  const lines = rows.map((row) => {
    return columns
      .map((c) => {
        const raw = c.getValue ? c.getValue(row) : (row as Record<string, unknown>)[c.key]
        const s = raw == null ? '' : String(raw).replace(/"/g, '""')
        return `"${s}"`
      })
      .join(',')
  })
  return [header, ...lines].join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === 'undefined') return
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Convert an SVG element to PNG and trigger a download.
 * @param scale - device pixel ratio multiplier (default 2 for retina)
 */
export async function downloadSvgAsPng(
  svgElement: SVGSVGElement,
  filename: string,
  scale = 2,
): Promise<void> {
  if (typeof document === 'undefined') return
  const xml = new XMLSerializer().serializeToString(svgElement)
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('SVG load failed'))
      img.src = url
    })
    const rect = svgElement.getBoundingClientRect()
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, rect.width * scale)
    canvas.height = Math.max(1, rect.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.scale(scale, scale)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    ctx.drawImage(img, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function todayStamp(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
