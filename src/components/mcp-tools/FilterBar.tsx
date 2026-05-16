// Wave F12.C — mcp-tools FilterBar.
// TimeRangePicker (shared) + tool select + status select + Refresh + CSV/PNG export.

import { Download, FileImage, RefreshCw } from '@landx/icons'
import TimeRangePicker from '@/components/shared/TimeRangePicker'
import { STATUS_LABEL, MCP_TOOL_NAMES, type McpCallStatus } from '@/lib/platform-mcp-tools'
import type { TimeRange } from '@/lib/super-admin-time-range'

export type ToolFilter = 'all' | (typeof MCP_TOOL_NAMES)[number]
export type StatusFilter = 'all' | McpCallStatus

export interface FilterBarProps {
  range: TimeRange
  onRangeChange: (next: TimeRange) => void
  toolFilter: ToolFilter
  onToolChange: (next: ToolFilter) => void
  statusFilter: StatusFilter
  onStatusChange: (next: StatusFilter) => void
  onRefresh: () => void
  onCsvExport: () => void
  onPngExport: () => void
}

export default function FilterBar({
  range,
  onRangeChange,
  toolFilter,
  onToolChange,
  statusFilter,
  onStatusChange,
  onRefresh,
  onCsvExport,
  onPngExport,
}: FilterBarProps) {
  return (
    <section
      className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5"
      data-testid="mcp-filter-bar"
    >
      <TimeRangePicker value={range} onChange={onRangeChange} testId="mcp-time-range" />

      <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Tool
      </span>
      <select
        value={toolFilter}
        onChange={(e) => onToolChange(e.target.value as ToolFilter)}
        className="rounded-lg border border-border bg-background/40 px-2.5 py-1 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        data-testid="mcp-tool-filter"
      >
        <option value="all">Hepsi</option>
        {MCP_TOOL_NAMES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Durum
      </span>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        className="rounded-lg border border-border bg-background/40 px-2.5 py-1 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        data-testid="mcp-status-filter"
      >
        <option value="all">Hepsi</option>
        {(['success', 'error', 'timeout'] as McpCallStatus[]).map((s) => (
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
          data-testid="mcp-refresh"
          aria-label="Yenile"
        >
          <RefreshCw className="h-3 w-3" /> Yenile
        </button>
        <button
          type="button"
          onClick={onCsvExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-2.5 py-1 text-xs text-foreground/80 transition hover:bg-foreground/[0.04]"
          data-testid="mcp-csv-export"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
        <button
          type="button"
          onClick={onPngExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-2.5 py-1 text-xs text-foreground/80 transition hover:bg-foreground/[0.04]"
          data-testid="mcp-png-export"
        >
          <FileImage className="h-3 w-3" /> PNG
        </button>
      </div>
    </section>
  )
}
