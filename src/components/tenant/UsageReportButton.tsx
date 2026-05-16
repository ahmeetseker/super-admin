// Wave F13.B — Tenant usage CSV report download button.
// Generates 30 days of deterministic mock usage (requests / MB / cost TL) keyed
// off tenant.id, then hands off to the shared `toCsv` + `downloadCsv` helpers.

import { useCallback, useState } from 'react'
import { Download } from '@landx/icons'
import {
  downloadCsv,
  toCsv,
  todayStamp,
  type CsvColumn,
} from '@/lib/super-admin-chart-export'

export interface UsageReportButtonProps {
  tenantId: string
  tenantName: string
}

interface UsageRow {
  date: string
  requests: number
  storageMB: number
  costTL: number
}

// Deterministic, seed-stable PRNG so the same tenant always yields the same
// CSV (helps QA reproduce, and keeps Playwright snapshots boring).
function hashString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function isoDay(dayOffset: number, now = Date.now()): string {
  const d = new Date(now - dayOffset * 24 * 60 * 60 * 1000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function buildUsageRows(tenantId: string, days = 30, now = Date.now()): UsageRow[] {
  const rng = mulberry32(hashString(tenantId))
  const rows: UsageRow[] = []
  // Reverse order — oldest first — so the CSV reads naturally.
  for (let i = days - 1; i >= 0; i--) {
    const r1 = rng()
    const r2 = rng()
    const r3 = rng()
    const requests = Math.round(800 + r1 * 4200)
    const storageMB = Math.round((4 + r2 * 36) * 10) / 10
    // Mock pricing — ~0.0008 TL/request + storage minimum.
    const costTL = Math.round((requests * 0.0008 + storageMB * 0.12 + r3 * 1.5) * 100) / 100
    rows.push({ date: isoDay(i, now), requests, storageMB, costTL })
  }
  return rows
}

export function UsageReportButton({ tenantId, tenantName }: UsageReportButtonProps) {
  const [isBusy, setIsBusy] = useState(false)

  const handleClick = useCallback(() => {
    setIsBusy(true)
    try {
      const rows = buildUsageRows(tenantId)
      const columns: CsvColumn<UsageRow>[] = [
        { key: 'date', label: 'Tarih' },
        { key: 'requests', label: 'İstek' },
        { key: 'storageMB', label: 'Depolama (MB)' },
        { key: 'costTL', label: 'Maliyet (TL)' },
      ]
      const csv = toCsv(rows, columns)
      const safeName = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      downloadCsv(`arsam-usage-${safeName || tenantId}-${todayStamp()}.csv`, csv)
    } finally {
      // Immediate reset — `downloadCsv` is synchronous w.r.t. anchor click.
      setIsBusy(false)
    }
  }, [tenantId, tenantName])

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      data-testid="usage-report-button"
      className="inline-flex items-center gap-1.5 text-left text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Download className="h-3.5 w-3.5" aria-hidden />
      Kullanım raporu indir (30 gün CSV)
    </button>
  )
}

export default UsageReportButton
