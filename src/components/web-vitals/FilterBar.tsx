// Wave F12.B — FilterBar: TimeRangePicker + device + browser + page +
// percentile dropdowns + Refresh. Pure controlled component — parent owns
// state.

import { RefreshCw, Download } from '@landx/icons'
import TimeRangePicker from '@/components/shared/TimeRangePicker'
import type { TimeRange } from '@/lib/super-admin-time-range'
import {
  BROWSERS,
  DEVICES,
  METRICS,
  type VitalBrowser,
  type VitalDevice,
  type VitalMetric,
} from '@/lib/platform-web-vitals'

export type PercentileChoice = 'p50' | 'p75' | 'p95'
export const PERCENTILE_OPTIONS: PercentileChoice[] = ['p50', 'p75', 'p95']

export interface FilterValue {
  range: TimeRange
  device: VitalDevice | 'all'
  browser: VitalBrowser | 'all'
  page: string | 'all'
  metric: VitalMetric | 'all'
  percentile: PercentileChoice
}

export interface FilterBarProps {
  value: FilterValue
  pages: string[]
  onChange: (next: FilterValue) => void
  onRefresh: () => void
  onExportCsv: () => void
}

const DEVICE_LABEL: Record<VitalDevice, string> = {
  desktop: 'Masaüstü',
  mobile: 'Mobil',
  tablet: 'Tablet',
}

const BROWSER_LABEL: Record<VitalBrowser, string> = {
  chrome: 'Chrome',
  safari: 'Safari',
  firefox: 'Firefox',
  edge: 'Edge',
}

export function FilterBar({ value, pages, onChange, onRefresh, onExportCsv }: FilterBarProps) {
  return (
    <section
      className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/40 p-3"
      data-testid="vitals-filter-bar"
    >
      <TimeRangePicker
        value={value.range}
        onChange={(range) => onChange({ ...value, range })}
        testId="vitals-time-range"
      />

      <FilterSelect
        label="Cihaz"
        value={value.device}
        testId="vitals-device-select"
        onChange={(device) => onChange({ ...value, device: device as VitalDevice | 'all' })}
        options={[
          { value: 'all', label: 'Hepsi' },
          ...DEVICES.map((d) => ({ value: d, label: DEVICE_LABEL[d] })),
        ]}
      />

      <FilterSelect
        label="Tarayıcı"
        value={value.browser}
        testId="vitals-browser-select"
        onChange={(browser) => onChange({ ...value, browser: browser as VitalBrowser | 'all' })}
        options={[
          { value: 'all', label: 'Hepsi' },
          ...BROWSERS.map((b) => ({ value: b, label: BROWSER_LABEL[b] })),
        ]}
      />

      <FilterSelect
        label="Sayfa"
        value={value.page}
        testId="vitals-page-select"
        onChange={(page) => onChange({ ...value, page })}
        options={[{ value: 'all', label: 'Hepsi' }, ...pages.map((p) => ({ value: p, label: p }))]}
      />

      <FilterSelect
        label="Metrik"
        value={value.metric}
        testId="vitals-metric-select"
        onChange={(metric) => onChange({ ...value, metric: metric as VitalMetric | 'all' })}
        options={[
          { value: 'all', label: 'Hepsi' },
          ...METRICS.map((m) => ({ value: m, label: m })),
        ]}
      />

      <FilterSelect
        label="Yüzdelik"
        value={value.percentile}
        testId="vitals-percentile-select"
        onChange={(percentile) =>
          onChange({ ...value, percentile: percentile as PercentileChoice })
        }
        options={PERCENTILE_OPTIONS.map((p) => ({ value: p, label: p }))}
      />

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition hover:bg-foreground/[0.04]"
          data-testid="vitals-refresh"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Yenile
        </button>
        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition hover:bg-foreground/[0.04]"
          data-testid="vitals-export-csv"
        >
          <Download className="h-3 w-3" aria-hidden />
          CSV
        </button>
      </div>
    </section>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (next: string) => void
  testId: string
}

function FilterSelect({ label, value, options, onChange, testId }: FilterSelectProps) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        data-testid={testId}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
