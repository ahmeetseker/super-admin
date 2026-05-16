// Wave F20.C — Cohort retention heatmap.
//
// Layout: rows = signup month, columns = retention windows (30/60/90 days).
// Each cell shows the retention rate (%) and the absolute retained/cohort
// counts. Background tint scales with the rate via `intensityClass` — three
// bands aligned to the token palette (rose <50%, amber 50-75%, emerald ≥75%).
//
// CSS grid + tint utility — SVG would be overkill for an 8x3 matrix.

import { useMemo } from 'react'
import type { CohortRow } from '@/lib/super-admin-tenant-analytics'

interface CohortMatrixProps {
  rows: readonly CohortRow[]
  /** Optional cap (most recent N rows). Defaults to 12 — matches the lib's
   *  natural ceiling but keeps the matrix readable when seeds expand. */
  maxRows?: number
}

const WINDOWS: ReadonlyArray<{ key: '30d' | '60d' | '90d'; label: string; field: keyof CohortRow }> = [
  { key: '30d', label: '30 gün', field: 'retention30d' },
  { key: '60d', label: '60 gün', field: 'retention60d' },
  { key: '90d', label: '90 gün', field: 'retention90d' },
]

export function intensityClass(rate: number): string {
  if (rate < 50) return 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
  if (rate < 75) return 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
  return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
}

function formatMonth(ym: string): string {
  // YYYY-MM → "Mar 2024" (Turkish month abbreviations)
  const [yearStr, monthStr] = ym.split('-')
  const month = Number(monthStr) - 1
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  return `${months[month] ?? monthStr} ${yearStr}`
}

function retained(rate: number, size: number): number {
  return Math.round((rate / 100) * size)
}

export function CohortMatrix({ rows, maxRows = 12 }: CohortMatrixProps) {
  const display = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.signupMonth.localeCompare(a.signupMonth))
    return sorted.slice(0, maxRows).reverse()
  }, [rows, maxRows])

  if (display.length === 0) {
    return (
      <div
        data-testid="cohort-matrix-empty"
        className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground"
      >
        Cohort verisi yok.
      </div>
    )
  }

  return (
    <section
      data-testid="cohort-matrix"
      aria-labelledby="cohort-matrix-heading"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <header className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h3
            id="cohort-matrix-heading"
            className="font-serif text-base tracking-tight"
          >
            Retention matrisi
          </h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Signup ay × 30/60/90 gün
          </p>
        </div>
        <Legend />
      </header>

      <div
        role="table"
        aria-label="Cohort retention matrisi"
        className="overflow-hidden rounded-xl border border-border"
      >
        <div
          role="row"
          className="grid grid-cols-[minmax(7rem,1.2fr)_repeat(3,minmax(0,1fr))] border-b border-border bg-foreground/[0.03] font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          <div role="columnheader" className="px-3 py-2">
            Signup ay
          </div>
          {WINDOWS.map((w) => (
            <div key={w.key} role="columnheader" className="px-3 py-2 text-center">
              {w.label}
            </div>
          ))}
        </div>
        {display.map((row) => (
          <div
            key={row.signupMonth}
            role="row"
            data-testid={`cohort-row-${row.signupMonth}`}
            className="grid grid-cols-[minmax(7rem,1.2fr)_repeat(3,minmax(0,1fr))] border-b border-border last:border-b-0"
          >
            <div role="rowheader" className="flex flex-col gap-0.5 px-3 py-2.5">
              <span className="text-sm font-medium tabular-nums">{formatMonth(row.signupMonth)}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                n={row.size}
              </span>
            </div>
            {WINDOWS.map((w) => {
              const rate = row[w.field] as number
              const r = retained(rate, row.size)
              return (
                <div
                  key={w.key}
                  role="cell"
                  data-testid={`cohort-cell-${row.signupMonth}-${w.key}`}
                  data-rate={rate}
                  title={`${formatMonth(row.signupMonth)} · ${w.label} retention: ${rate}% (${r}/${row.size})`}
                  className={`m-1 flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 ${intensityClass(rate)}`}
                >
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {rate}%
                  </span>
                  <span className="font-mono text-[10px] tabular-nums opacity-80">
                    {r}/{row.size}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

function Legend() {
  return (
    <ul
      aria-label="Renk skalası"
      className="hidden items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground sm:flex"
    >
      <li className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded bg-rose-500/40" aria-hidden />
        <span>&lt; 50%</span>
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded bg-amber-500/40" aria-hidden />
        <span>50-75%</span>
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded bg-emerald-500/40" aria-hidden />
        <span>≥ 75%</span>
      </li>
    </ul>
  )
}

export default CohortMatrix
