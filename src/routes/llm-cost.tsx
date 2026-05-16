// Wave F12.A — /ops/llm-cost route. Time range + filters + chart + table + CSV/PNG export.
import { useMemo, useRef, useState } from 'react'
import { PageShell } from '@landx/ui'
import KpiCards from '@/components/llm-cost/KpiCards'
import CostBarChart from '@/components/llm-cost/CostBarChart'
import CostTable from '@/components/llm-cost/CostTable'
import FilterBar from '@/components/llm-cost/FilterBar'
import {
  computeLlmKpis,
  getLlmCostEntries,
  summarizeByModel,
  type LlmModel,
  MODEL_LABEL,
} from '@/lib/platform-llm-cost'
import { createPresetRange, inRange, type TimeRange } from '@/lib/super-admin-time-range'
import { downloadCsv, downloadSvgAsPng, toCsv, todayStamp } from '@/lib/super-admin-chart-export'

export function LlmCost() {
  const [range, setRange] = useState<TimeRange>(() => createPresetRange('7d'))
  const [tenantId, setTenantId] = useState<string>('all')
  const [model, setModel] = useState<'all' | LlmModel>('all')
  const [refreshTick, setRefreshTick] = useState(0)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const allEntries = useMemo(() => getLlmCostEntries(), [])

  const filtered = useMemo(() => {
    return allEntries.filter((e) => {
      if (!inRange(e.timestamp, range)) return false
      if (tenantId !== 'all' && e.tenantId !== tenantId) return false
      if (model !== 'all' && e.model !== model) return false
      return true
    })
    // refreshTick is intentionally in deps so a manual refresh re-runs the
    // filter (currently identity, but useful when we wire real fetches).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEntries, range, tenantId, model, refreshTick])

  const kpis = useMemo(() => computeLlmKpis(filtered), [filtered])
  const summary = useMemo(() => summarizeByModel(filtered), [filtered])

  function handleExportCsv() {
    const csv = toCsv(filtered, [
      { key: 'id', label: 'id' },
      {
        key: 'timestamp',
        label: 'timestamp',
        getValue: (r) => new Date(r.timestamp).toISOString(),
      },
      { key: 'model', label: 'model', getValue: (r) => MODEL_LABEL[r.model] },
      { key: 'tenantId', label: 'tenant' },
      { key: 'promptTokens', label: 'prompt_tokens' },
      { key: 'completionTokens', label: 'completion_tokens' },
      { key: 'costTL', label: 'cost_tl' },
    ])
    downloadCsv(`llm-cost-${todayStamp()}.csv`, csv)
  }

  function handleExportPng() {
    if (svgRef.current) {
      void downloadSvgAsPng(svgRef.current, `llm-cost-${todayStamp()}.png`)
    }
  }

  return (
    <PageShell
      eyebrow="MOD · LLM COST"
      title={
        <>
          LLM <em className="font-serif italic font-light">harcaması</em>
        </>
      }
      description={`${filtered.length} çağrı · ${kpis.totalCostTL.toFixed(2)} ₺ · seçili zaman aralığı.`}
    >
      <KpiCards kpis={kpis} />
      <FilterBar
        range={range}
        onRangeChange={setRange}
        tenantId={tenantId}
        onTenantChange={setTenantId}
        model={model}
        onModelChange={setModel}
        onRefresh={() => setRefreshTick((t) => t + 1)}
        onExportCsv={handleExportCsv}
        onExportPng={handleExportPng}
        filteredCount={filtered.length}
        totalCount={allEntries.length}
      />
      <section className="mb-6">
        <CostBarChart ref={svgRef} entries={filtered} range={range} />
      </section>
      <section>
        <CostTable rows={summary} />
      </section>
    </PageShell>
  )
}
