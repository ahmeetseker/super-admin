// /web-vitals — Wave F12.B + F25.B (Agent F25.B).
//
// Mounts platform-web-vitals.ts seed (500 entries / 30d) and renders 5 metric
// cards (p50/p75/p95 + Core Web Vitals status), per-metric multi-line charts,
// an alert panel for Google-threshold violations, and a CSV export. Filters
// (time range / device / browser / page / metric / percentile) drive both the
// summary and chart layers.
//
// F25.B closes the F12.B "follow-up wave" note: a tab selector
// (?source=mock|live) toggles between the deterministic platform store
// (default) and the LiveRumPanel which streams from
// `arsam.web-vitals.recent.v1` (public-site web-vitals-client buffer).

import { useCallback, useEffect, useMemo, useState, Suspense, lazy } from 'react'
import { useSearchParams } from 'react-router'
import { PageShell, Skeleton, cn } from '@landx/ui'
import {
  createPresetRange,
  timeBuckets,
} from '@/lib/super-admin-time-range'
import {
  downloadCsv,
  todayStamp,
  toCsv,
} from '@/lib/super-admin-chart-export'
import {
  filterEntries,
  getEntries,
  getDistinctPages,
  METRICS,
  summarizeAll,
  type VitalEntry,
  type VitalMetric,
} from '@/lib/platform-web-vitals'
import { MetricCards } from '@/components/web-vitals/MetricCards'
import { VitalsChart } from '@/components/web-vitals/VitalsChart'
import { AlertPanel } from '@/components/web-vitals/AlertPanel'
import {
  FilterBar,
  type FilterValue,
} from '@/components/web-vitals/FilterBar'

const LiveRumPanel = lazy(() =>
  import('@/components/web-vitals/LiveRumPanel').then((m) => ({
    default: m.LiveRumPanel,
  })),
)

type VitalsSource = 'mock' | 'live'

const SOURCE_TABS: { id: VitalsSource; label: string }[] = [
  { id: 'mock', label: 'Mock (platform seed)' },
  { id: 'live', label: 'Live RUM' },
]

function isSource(value: string | null): value is VitalsSource {
  return value === 'mock' || value === 'live'
}

function defaultFilter(): FilterValue {
  return {
    range: createPresetRange('7d'),
    device: 'all',
    browser: 'all',
    page: 'all',
    metric: 'all',
    percentile: 'p75',
  }
}

export function WebVitals() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawSource = searchParams.get('source')
  const source: VitalsSource = isSource(rawSource) ? rawSource : 'mock'

  const selectSource = useCallback(
    (next: VitalsSource) => {
      const params = new URLSearchParams(searchParams)
      if (next === 'mock') params.delete('source')
      else params.set('source', next)
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const [allEntries, setAllEntries] = useState<VitalEntry[]>([])
  const [filter, setFilter] = useState<FilterValue>(() => defaultFilter())

  const reload = useCallback(() => {
    setAllEntries(getEntries())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const pages = useMemo(() => getDistinctPages(allEntries), [allEntries])

  const scopedEntries = useMemo(() => {
    return filterEntries(allEntries, {
      device: filter.device === 'all' ? undefined : filter.device,
      browser: filter.browser === 'all' ? undefined : filter.browser,
      page: filter.page === 'all' ? undefined : filter.page,
      startMs: filter.range.startMs,
      endMs: filter.range.endMs,
    })
  }, [allEntries, filter])

  // Summary uses all metrics so the cards always show 5 tiles regardless of
  // the metric filter; the chart section is filtered separately.
  const summaries = useMemo(() => summarizeAll(scopedEntries), [scopedEntries])

  const buckets = useMemo(() => timeBuckets(filter.range, 24), [filter.range])

  const chartMetrics: VitalMetric[] = useMemo(() => {
    if (filter.metric === 'all') return [...METRICS]
    return [filter.metric]
  }, [filter.metric])

  const handleExportCsv = useCallback(() => {
    const csv = toCsv(scopedEntries, [
      { key: 'id', label: 'id' },
      { key: 'timestamp', label: 'timestamp' },
      {
        key: 'timestampIso',
        label: 'timestampIso',
        getValue: (row) => new Date(row.timestamp).toISOString(),
      },
      { key: 'page', label: 'page' },
      { key: 'device', label: 'device' },
      { key: 'browser', label: 'browser' },
      { key: 'metric', label: 'metric' },
      { key: 'value', label: 'value' },
    ])
    downloadCsv(`web-vitals-${todayStamp()}.csv`, csv)
  }, [scopedEntries])

  return (
    <PageShell
      eyebrow="MOD · WEB VITALS"
      title={
        <>
          Core Web <em className="font-serif italic font-light">Vitals</em>
        </>
      }
      description={
        source === 'live'
          ? 'Live RUM — public-site web-vitals-client buffer (arsam.web-vitals.recent.v1).'
          : `Platform performans göstergeleri — ${scopedEntries.length}/${allEntries.length} örnek seçili filtre kapsamında.`
      }
    >
      <nav
        aria-label="Web Vitals kaynak seçici"
        data-testid="web-vitals-source-tabs"
        className="-mt-2 mb-6 flex items-center gap-1 overflow-x-auto border-b border-border"
      >
        {SOURCE_TABS.map((t) => {
          const active = source === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`web-vitals-source-${t.id}`}
              onClick={() => selectSource(t.id)}
              className={cn(
                '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition',
                active
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      {source === 'live' ? (
        <Suspense
          fallback={
            <section
              data-testid="vitals-live-skeleton"
              className="space-y-3"
            >
              <Skeleton className="h-16" />
              <Skeleton className="h-32" />
            </section>
          }
        >
          <LiveRumPanel />
        </Suspense>
      ) : (
        <>
          <FilterBar
            value={filter}
            pages={pages}
            onChange={setFilter}
            onRefresh={reload}
            onExportCsv={handleExportCsv}
          />

          {allEntries.length === 0 ? (
            <section
              data-testid="vitals-skeleton"
              className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5"
            >
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </section>
          ) : (
            <MetricCards summaries={summaries} />
          )}

          <section
            className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-2"
            data-testid="vitals-charts"
          >
            {chartMetrics.map((m) => (
              <VitalsChart key={m} entries={scopedEntries} metric={m} buckets={buckets} />
            ))}
          </section>

          <AlertPanel entries={scopedEntries} limit={10} />
        </>
      )}
    </PageShell>
  )
}

export default WebVitals
