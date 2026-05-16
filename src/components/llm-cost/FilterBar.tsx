// Wave F12.A — LLM cost filter bar.
import { Download, Image as ImageIcon, RefreshCw } from '@landx/icons'
import { TENANTS } from '@landx/data'
import TimeRangePicker from '@/components/shared/TimeRangePicker'
import { MODELS, MODEL_LABEL, type LlmModel } from '@/lib/platform-llm-cost'
import type { TimeRange } from '@/lib/super-admin-time-range'

export interface FilterBarProps {
  range: TimeRange
  onRangeChange: (range: TimeRange) => void
  tenantId: string
  onTenantChange: (id: string) => void
  model: 'all' | LlmModel
  onModelChange: (m: 'all' | LlmModel) => void
  onRefresh: () => void
  onExportCsv: () => void
  onExportPng: () => void
  filteredCount: number
  totalCount: number
}

export default function FilterBar({
  range,
  onRangeChange,
  tenantId,
  onTenantChange,
  model,
  onModelChange,
  onRefresh,
  onExportCsv,
  onExportPng,
  filteredCount,
  totalCount,
}: FilterBarProps) {
  return (
    <section
      className="mb-5 flex flex-wrap items-center gap-3"
      data-testid="llm-cost-filter-bar"
    >
      <TimeRangePicker value={range} onChange={onRangeChange} testId="llm-cost-range" />
      <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Kiracı</span>
        <select
          value={tenantId}
          onChange={(e) => onTenantChange(e.target.value)}
          className="bg-transparent text-[12px] font-medium text-foreground/90 outline-none"
          data-testid="llm-cost-tenant"
        >
          <option value="all">Tümü</option>
          {TENANTS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Model</span>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value as 'all' | LlmModel)}
          className="bg-transparent text-[12px] font-medium text-foreground/90 outline-none"
          data-testid="llm-cost-model"
        >
          <option value="all">Tümü</option>
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {MODEL_LABEL[m]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-[12px] font-medium hover:bg-foreground/[0.04]"
        data-testid="llm-cost-refresh"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Yenile
      </button>
      <button
        type="button"
        onClick={onExportCsv}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-[12px] font-medium hover:bg-foreground/[0.04]"
        data-testid="llm-cost-export-csv"
      >
        <Download className="h-3.5 w-3.5" /> CSV
      </button>
      <button
        type="button"
        onClick={onExportPng}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-[12px] font-medium hover:bg-foreground/[0.04]"
        data-testid="llm-cost-export-png"
      >
        <ImageIcon className="h-3.5 w-3.5" /> PNG
      </button>
      <span
        className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        data-testid="llm-cost-count"
      >
        {filteredCount} / {totalCount}
      </span>
    </section>
  )
}
