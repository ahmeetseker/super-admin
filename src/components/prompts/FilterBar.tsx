// Wave F12.C — prompts FilterBar.
// TimeRangePicker + name search + status select + Refresh + CSV export.

import { Download, RefreshCw, Search } from '@landx/icons'
import TimeRangePicker from '@/components/shared/TimeRangePicker'
import { STATUS_LABEL, type PromptVersionStatus } from '@/lib/platform-prompts'
import type { TimeRange } from '@/lib/super-admin-time-range'

export type PromptStatusFilter = 'all' | PromptVersionStatus

export interface FilterBarProps {
  range: TimeRange
  onRangeChange: (next: TimeRange) => void
  query: string
  onQueryChange: (next: string) => void
  statusFilter: PromptStatusFilter
  onStatusChange: (next: PromptStatusFilter) => void
  onRefresh: () => void
  onCsvExport: () => void
}

export default function FilterBar({
  range,
  onRangeChange,
  query,
  onQueryChange,
  statusFilter,
  onStatusChange,
  onRefresh,
  onCsvExport,
}: FilterBarProps) {
  return (
    <section
      className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5"
      data-testid="prompts-filter-bar"
    >
      <TimeRangePicker value={range} onChange={onRangeChange} testId="prompts-time-range" />

      <div className="ml-1 inline-flex items-center gap-1.5">
        <Search className="h-3 w-3 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Prompt adı ara…"
          className="w-44 rounded-lg border border-border bg-background/40 px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          data-testid="prompts-search"
        />
      </div>

      <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Durum
      </span>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as PromptStatusFilter)}
        className="rounded-lg border border-border bg-background/40 px-2.5 py-1 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        data-testid="prompts-status-filter"
      >
        <option value="all">Hepsi</option>
        {(['active', 'archived', 'draft'] as PromptVersionStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <div className="ml-auto inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-2.5 py-1 text-xs text-foreground/80 transition hover:bg-foreground/[0.04]"
          data-testid="prompts-refresh"
        >
          <RefreshCw className="h-3 w-3" /> Yenile
        </button>
        <button
          type="button"
          onClick={onCsvExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-2.5 py-1 text-xs text-foreground/80 transition hover:bg-foreground/[0.04]"
          data-testid="prompts-csv-export"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
    </section>
  )
}
