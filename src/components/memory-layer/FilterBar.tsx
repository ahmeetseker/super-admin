// Wave F12.D — memory layer filter bar.
// TimeRangePicker + type select + scope select + agentId select + Refresh.
import { RefreshCw } from '@landx/icons'
import TimeRangePicker from '@/components/shared/TimeRangePicker'
import type { TimeRange } from '@/lib/super-admin-time-range'
import {
  AGENT_POOL,
  TYPE_LABEL,
  SCOPE_LABEL,
  type MemoryEntryType,
  type MemoryEntryScope,
} from '@/lib/platform-memory'

export interface MemoryFilterValue {
  range: TimeRange
  type: MemoryEntryType | 'all'
  scope: MemoryEntryScope | 'all'
  agentId: string | 'all'
}

interface FilterBarProps {
  value: MemoryFilterValue
  onChange: (next: MemoryFilterValue) => void
  onRefresh: () => void
}

export function FilterBar({ value, onChange, onRefresh }: FilterBarProps) {
  return (
    <section
      className="mb-5 flex flex-wrap items-end gap-3"
      data-testid="memory-filter-bar"
    >
      <TimeRangePicker
        value={value.range}
        onChange={(r) => onChange({ ...value, range: r })}
        testId="memory-time-range"
      />

      <label className="flex flex-col gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Tip
        </span>
        <select
          value={value.type}
          onChange={(e) =>
            onChange({ ...value, type: e.target.value as MemoryFilterValue['type'] })
          }
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] text-foreground/90"
          data-testid="memory-filter-type"
        >
          <option value="all">Hepsi</option>
          <option value="long-term">{TYPE_LABEL['long-term']}</option>
          <option value="working">{TYPE_LABEL['working']}</option>
          <option value="episodic">{TYPE_LABEL['episodic']}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Scope
        </span>
        <select
          value={value.scope}
          onChange={(e) =>
            onChange({ ...value, scope: e.target.value as MemoryFilterValue['scope'] })
          }
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] text-foreground/90"
          data-testid="memory-filter-scope"
        >
          <option value="all">Hepsi</option>
          <option value="tenant">{SCOPE_LABEL.tenant}</option>
          <option value="agent">{SCOPE_LABEL.agent}</option>
          <option value="global">{SCOPE_LABEL.global}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Agent
        </span>
        <select
          value={value.agentId}
          onChange={(e) => onChange({ ...value, agentId: e.target.value })}
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] text-foreground/90"
          data-testid="memory-filter-agent"
        >
          <option value="all">Hepsi</option>
          {AGENT_POOL.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-1.5 self-end rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04]"
        data-testid="memory-refresh"
      >
        <RefreshCw className="h-3 w-3" /> Yenile
      </button>
    </section>
  )
}
