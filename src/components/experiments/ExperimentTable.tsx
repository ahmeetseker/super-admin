// Wave F26.C — A/B experiments table.
//
// Status filter chip strip + sortable-by-status table. Each row exposes
// experiment metadata (key, name, status, variant count, totals) and emits
// a click event for the parent dashboard to open the detail panel.

import { useMemo } from 'react'
import type { Experiment, ExperimentStatus } from '@/lib/ab-experiments'

export type StatusFilter = 'all' | ExperimentStatus

const STATUS_LABEL: Record<ExperimentStatus, string> = {
  draft: 'Taslak',
  running: 'Aktif',
  paused: 'Duraklatıldı',
  completed: 'Tamamlandı',
}

const STATUS_TONE: Record<ExperimentStatus, string> = {
  draft: 'bg-stone-500/10 text-stone-700 dark:text-stone-300',
  running: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  paused: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  completed: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
}

export function statusBadgeClass(status: ExperimentStatus): string {
  return STATUS_TONE[status]
}

export function statusLabel(status: ExperimentStatus): string {
  return STATUS_LABEL[status]
}

interface ExperimentTableProps {
  experiments: readonly Experiment[]
  filter: StatusFilter
  onFilterChange: (next: StatusFilter) => void
  selectedId: string | null
  onSelect: (id: string) => void
}

const FILTERS: ReadonlyArray<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'running', label: 'Aktif' },
  { key: 'draft', label: 'Taslak' },
  { key: 'paused', label: 'Duraklatıldı' },
  { key: 'completed', label: 'Tamamlandı' },
]

export function ExperimentTable({
  experiments,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
}: ExperimentTableProps) {
  const rows = useMemo(() => {
    if (filter === 'all') return experiments
    return experiments.filter((e) => e.status === filter)
  }, [experiments, filter])

  return (
    <section
      data-testid="experiment-table"
      aria-labelledby="experiment-table-heading"
      className="rounded-2xl border border-border bg-card"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2
            id="experiment-table-heading"
            className="font-serif text-base tracking-tight"
          >
            Deneyler
          </h2>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {rows.length} kayıt · {filter === 'all' ? 'tüm durumlar' : statusLabel(filter)}
          </p>
        </div>

        <div
          role="group"
          aria-label="Durum filtresi"
          data-testid="experiment-status-filter"
          className="flex flex-wrap items-center gap-1"
        >
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                data-testid={`experiment-filter-${f.key}`}
                onClick={() => onFilterChange(f.key)}
                className={
                  'rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition ' +
                  (active
                    ? 'bg-foreground text-background'
                    : 'border border-border bg-card text-muted-foreground hover:text-foreground')
                }
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </header>

      {rows.length === 0 ? (
        <div
          data-testid="experiment-table-empty"
          className="p-8 text-center text-sm text-muted-foreground"
        >
          Bu durumla eşleşen deney yok.
        </div>
      ) : (
        <div
          role="table"
          aria-label="Deney listesi"
          className="divide-y divide-border/60"
        >
          <div
            role="row"
            className="grid grid-cols-[minmax(8rem,1.4fr)_minmax(10rem,2fr)_5rem_4rem_5rem_5rem] gap-3 bg-foreground/[0.03] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            <div role="columnheader">Key</div>
            <div role="columnheader">Ad</div>
            <div role="columnheader">Durum</div>
            <div role="columnheader" className="text-right">Varyant</div>
            <div role="columnheader" className="text-right">Exposure</div>
            <div role="columnheader" className="text-right">Conversion</div>
          </div>
          {rows.map((exp) => {
            const exposures = exp.variants.reduce((s, v) => s + (v.exposures ?? 0), 0)
            const conversions = exp.variants.reduce(
              (s, v) => s + (v.conversions ?? 0),
              0,
            )
            const selected = exp.id === selectedId
            return (
              <button
                key={exp.id}
                type="button"
                role="row"
                aria-selected={selected}
                data-testid={`experiment-row-${exp.id}`}
                data-status={exp.status}
                onClick={() => onSelect(exp.id)}
                className={
                  'grid w-full grid-cols-[minmax(8rem,1.4fr)_minmax(10rem,2fr)_5rem_4rem_5rem_5rem] items-center gap-3 px-4 py-3 text-left text-sm transition ' +
                  (selected
                    ? 'bg-foreground/[0.04]'
                    : 'hover:bg-foreground/[0.03]')
                }
              >
                <div role="cell" className="truncate font-mono text-[11px] text-muted-foreground">
                  {exp.key}
                </div>
                <div role="cell" className="min-w-0">
                  <div className="truncate font-medium tracking-tight">{exp.name}</div>
                  {exp.description && (
                    <div className="truncate text-[11px] text-muted-foreground">
                      {exp.description}
                    </div>
                  )}
                </div>
                <div role="cell">
                  <span
                    data-testid={`experiment-status-${exp.id}`}
                    className={
                      'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] ' +
                      statusBadgeClass(exp.status)
                    }
                  >
                    {statusLabel(exp.status)}
                  </span>
                </div>
                <div role="cell" className="text-right font-mono text-[12px] tabular-nums">
                  {exp.variants.length}
                </div>
                <div role="cell" className="text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                  {exposures.toLocaleString('tr-TR')}
                </div>
                <div role="cell" className="text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                  {conversions.toLocaleString('tr-TR')}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ExperimentTable
