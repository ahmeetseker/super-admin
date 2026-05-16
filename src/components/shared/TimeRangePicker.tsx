// Shared TimeRangePicker — preset dropdown + custom date range.
// Used by F12 AI/observability panels.
import { useState } from 'react'
import {
  PRESET_OPTIONS,
  PRESET_LABEL,
  createPresetRange,
  createCustomRange,
  formatRangeLabel,
  type TimeRange,
  type TimeRangePreset,
} from '@/lib/super-admin-time-range'

export interface TimeRangePickerProps {
  value: TimeRange
  onChange: (next: TimeRange) => void
  testId?: string
}

function toInputDate(ms: number): string {
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromInputDate(value: string, endOfDay = false): number {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return Date.now()
  const ms = new Date(y, m - 1, d).getTime()
  return endOfDay ? ms + 24 * 60 * 60 * 1000 - 1 : ms
}

export default function TimeRangePicker({ value, onChange, testId = 'time-range-picker' }: TimeRangePickerProps) {
  const [customStart, setCustomStart] = useState(toInputDate(value.startMs))
  const [customEnd, setCustomEnd] = useState(toInputDate(value.endMs))

  function handlePresetChange(next: TimeRangePreset) {
    if (next === 'custom') {
      onChange(createCustomRange(fromInputDate(customStart), fromInputDate(customEnd, true)))
    } else {
      onChange(createPresetRange(next))
    }
  }

  function handleCustomApply() {
    onChange(createCustomRange(fromInputDate(customStart), fromInputDate(customEnd, true)))
  }

  return (
    <div className="inline-flex items-center gap-2" data-testid={testId}>
      <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Zaman aralığı
      </label>
      <select
        value={value.preset}
        onChange={(e) => handlePresetChange(e.target.value as TimeRangePreset)}
        className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        data-testid={`${testId}-preset`}
      >
        {PRESET_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt === 'custom' ? 'Özel' : PRESET_LABEL[opt]}
          </option>
        ))}
      </select>
      {value.preset === 'custom' && (
        <div className="inline-flex items-center gap-1.5">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs"
            data-testid={`${testId}-start`}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs"
            data-testid={`${testId}-end`}
          />
          <button
            type="button"
            onClick={handleCustomApply}
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs hover:bg-accent"
            data-testid={`${testId}-apply`}
          >
            Uygula
          </button>
        </div>
      )}
      <span className="font-mono text-[10px] text-muted-foreground" data-testid={`${testId}-label`}>
        {formatRangeLabel(value)}
      </span>
    </div>
  )
}
