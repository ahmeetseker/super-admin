// Wave F12.C — MCP tool registry + call analytics dashboard.
// Refactored from the F10.A registry view: kept the @landx/data registry table
// but layered platform-mcp-tools call analytics (summary + chart + drawer) on top.

import { useCallback, useMemo, useRef, useState } from 'react'
import { Fragment } from 'react'
import { Wrench, ChevronDown, ChevronRight, Plus, Database, Zap, BarChart3, Cable } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { MCP_TOOLS, type McpTool, type McpToolStatus } from '@landx/data'

import FilterBar, { type StatusFilter, type ToolFilter } from '@/components/mcp-tools/FilterBar'
import ToolSummary from '@/components/mcp-tools/ToolSummary'
import ToolUsageChart from '@/components/mcp-tools/ToolUsageChart'
import ToolDetailDrawer from '@/components/mcp-tools/ToolDetailDrawer'

import { getMcpToolCalls, summarizeMcpTools, formatDurationMs } from '@/lib/platform-mcp-tools'
import {
  createPresetRange,
  inRange,
  type TimeRange,
} from '@/lib/super-admin-time-range'
import { downloadCsv, downloadSvgAsPng, todayStamp, toCsv } from '@/lib/super-admin-chart-export'

const CATEGORY_LABEL: Record<McpTool['category'], string> = {
  data: 'Veri',
  action: 'Aksiyon',
  analytics: 'Analitik',
  integration: 'Entegrasyon',
}

const CATEGORY_ICON: Record<McpTool['category'], React.ComponentType<{ className?: string }>> = {
  data: Database,
  action: Zap,
  analytics: BarChart3,
  integration: Cable,
}

const STATUS_TONE: Record<McpToolStatus, string> = {
  enabled: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  beta: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  deprecated: 'bg-stone-500/10 text-stone-600 dark:text-stone-400',
  disabled: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

const STATUS_LABEL: Record<McpToolStatus, string> = {
  enabled: 'Aktif',
  beta: 'Beta',
  deprecated: 'Kullanım dışı',
  disabled: 'Kapalı',
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`
}

function errorTone(rate: number): string {
  if (rate < 0.001) return 'text-emerald-700 dark:text-emerald-300'
  if (rate < 0.005) return 'text-foreground/80'
  if (rate < 0.02) return 'text-amber-700 dark:text-amber-300'
  return 'text-rose-700 dark:text-rose-300'
}

export function McpTools() {
  // ── F12 call analytics state ───────────────────────────────────────────────
  const [range, setRange] = useState<TimeRange>(() => createPresetRange('30d'))
  const [toolFilter, setToolFilter] = useState<ToolFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [refreshTick, setRefreshTick] = useState(0)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const filteredCalls = useMemo(() => {
    void refreshTick // re-run on refresh tick to surface refreshes in render
    return getMcpToolCalls().filter((c) => {
      if (!inRange(c.timestampMs, range)) return false
      if (toolFilter !== 'all' && c.toolName !== toolFilter) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      return true
    })
  }, [range, toolFilter, statusFilter, refreshTick])

  const summary = useMemo(() => summarizeMcpTools(filteredCalls), [filteredCalls])

  const totalCalls30d = filteredCalls.length
  const overallSuccess = filteredCalls.length === 0
    ? 0
    : filteredCalls.filter((c) => c.status === 'success').length / filteredCalls.length
  const overallAvgDuration = filteredCalls.length === 0
    ? 0
    : Math.round(filteredCalls.reduce((s, c) => s + c.durationMs, 0) / filteredCalls.length)

  const handleRefresh = useCallback(() => setRefreshTick((n) => n + 1), [])

  const handleCsvExport = useCallback(() => {
    const csv = toCsv(summary, [
      { key: 'toolName', label: 'Tool' },
      { key: 'callCount', label: 'Çağrı' },
      { key: 'successCount', label: 'Başarılı' },
      { key: 'errorCount', label: 'Hata' },
      { key: 'timeoutCount', label: 'Timeout' },
      { key: 'successRate', label: 'Başarı Oranı', getValue: (r) => `${(r.successRate * 100).toFixed(2)}%` },
      { key: 'avgDurationMs', label: 'Ort. Süre (ms)' },
      { key: 'p95DurationMs', label: 'p95 (ms)' },
    ])
    downloadCsv(`mcp-tools-summary-${todayStamp()}.csv`, csv)
  }, [summary])

  const handlePngExport = useCallback(() => {
    if (svgRef.current) {
      void downloadSvgAsPng(svgRef.current, `mcp-tools-chart-${todayStamp()}.png`)
    }
  }, [])

  // ── F10.A registry view (preserved) ────────────────────────────────────────
  const [categoryFilter, setCategoryFilter] = useState<'all' | McpTool['category']>('all')
  const [registryStatusFilter, setRegistryStatusFilter] = useState<'all' | McpToolStatus>('all')
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const namespaces = useMemo(() => {
    return Array.from(new Set(MCP_TOOLS.map((t) => t.namespace))).sort()
  }, [])

  const registryFiltered = useMemo(() => {
    return MCP_TOOLS.filter((t) => {
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      if (registryStatusFilter !== 'all' && t.status !== registryStatusFilter) return false
      if (namespaceFilter !== 'all' && t.namespace !== namespaceFilter) return false
      return true
    })
  }, [categoryFilter, registryStatusFilter, namespaceFilter])

  const total = MCP_TOOLS.length
  const enabledCount = MCP_TOOLS.filter((t) => t.status === 'enabled').length
  const totalRegistryCalls = MCP_TOOLS.reduce((s, t) => s + t.callsThisMonth, 0)
  const dominantNamespace = useMemo(() => {
    const tally: Record<string, number> = {}
    MCP_TOOLS.forEach((t) => {
      tally[t.namespace] = (tally[t.namespace] ?? 0) + t.callsThisMonth
    })
    return Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  }, [])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <PageShell
      eyebrow="MOD · A02 · MCP TOOL ANALİTİK"
      title={
        <>
          MCP <em className="font-serif italic font-light">tool çağrı analitiği</em>
        </>
      }
      description={`${total} araç · ${enabledCount} aktif · ${fmtCount(totalRegistryCalls)} çağrı / ay · baskın: ${dominantNamespace}.`}
      actions={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Yeni tool kaydet
        </button>
      }
    >
      {/* F12 KPI cards driven by call analytics */}
      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="mcp-kpi-row">
        <Stat label="Filtrelenen çağrı" value={String(totalCalls30d)} hint="zaman aralığında" />
        <Stat label="Başarı oranı" value={fmtPct(overallSuccess)} hint="filtre dahil" />
        <Stat label="Ort. süre" value={formatDurationMs(overallAvgDuration)} hint="filtre dahil" />
        <Stat label="Aktif tool" value={`${summary.filter((r) => r.callCount > 0).length} / ${summary.length}`} hint="filtrelenmiş" mono />
      </section>

      <FilterBar
        range={range}
        onRangeChange={setRange}
        toolFilter={toolFilter}
        onToolChange={setToolFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onRefresh={handleRefresh}
        onCsvExport={handleCsvExport}
        onPngExport={handlePngExport}
      />

      <div className="mb-5">
        <ToolUsageChart ref={svgRef} calls={filteredCalls} range={range} bucketCount={30} />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 font-serif text-base font-light tracking-tight">Tool özet tablosu</h2>
        <ToolSummary rows={summary} onSelectTool={(name) => setSelectedTool(name)} />
      </div>

      {selectedTool && (
        <ToolDetailDrawer toolName={selectedTool} onClose={() => setSelectedTool(null)} />
      )}

      {/* ── Registry view (preserved from F10.A) ─────────────────────────── */}
      <section className="mb-3 -mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {(['all', 'data', 'action', 'analytics', 'integration'] as const).map((c) => {
            const isActive = categoryFilter === c
            const count = c === 'all' ? MCP_TOOLS.length : MCP_TOOLS.filter((t) => t.category === c).length
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={cn(
                  'inline-flex flex-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                  isActive ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {c === 'all' ? 'Hepsi' : CATEGORY_LABEL[c]}
                <span className={cn('rounded-full px-1.5 font-mono text-[10px] tabular-nums', isActive ? 'bg-background/20' : 'bg-foreground/[0.06]')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-5 flex flex-wrap items-center gap-2">
        {(['all', 'enabled', 'beta', 'deprecated'] as const).map((s) => {
          const isActive = registryStatusFilter === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setRegistryStatusFilter(s)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition',
                isActive
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {s === 'all' ? 'Tüm durumlar' : STATUS_LABEL[s as McpToolStatus]}
            </button>
          )
        })}
        <div className="ml-auto inline-flex items-center gap-2">
          <label htmlFor="ns-select" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Namespace
          </label>
          <select
            id="ns-select"
            value={namespaceFilter}
            onChange={(e) => setNamespaceFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[12px] text-foreground/90"
          >
            <option value="all">Hepsi</option>
            {namespaces.map((ns) => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-background/30">
              <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="w-8 px-3 py-2.5"></th>
                <th className="px-3 py-2.5">Tool</th>
                <th className="px-3 py-2.5">Durum</th>
                <th className="px-3 py-2.5 text-right">Çağrı / ay</th>
                <th className="px-3 py-2.5 text-right">Latency</th>
                <th className="px-3 py-2.5 text-right">Hata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {registryFiltered.map((t) => {
                const isOpen = expanded.has(t.id)
                const Icon = CATEGORY_ICON[t.category]
                return (
                  <Fragment key={t.id}>
                    <tr
                      className="cursor-pointer transition hover:bg-foreground/[0.02]"
                      onClick={() => toggle(t.id)}
                    >
                      <td className="px-3 py-3 align-top text-muted-foreground">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-foreground/[0.06]">
                            <Icon className="h-3.5 w-3.5 text-foreground/80" />
                          </span>
                          <div className="min-w-0">
                            <div className="font-mono text-[12px] tabular-nums">
                              <span className="text-muted-foreground">{t.namespace}.</span>
                              <span className="font-medium text-foreground">{t.name}</span>
                            </div>
                            <div className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">{t.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium', STATUS_TONE[t.status])}>
                          {STATUS_LABEL[t.status]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums">{fmtCount(t.callsThisMonth)}</td>
                      <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums text-muted-foreground">{t.avgLatencyMs}ms</td>
                      <td className={cn('px-3 py-3 text-right font-mono text-[12px] tabular-nums', errorTone(t.errorRate))}>{fmtPct(t.errorRate)}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-background/40">
                        <td></td>
                        <td colSpan={5} className="px-3 pb-4 pt-1">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <SchemaBox label="input" value={t.schema.input} />
                            <SchemaBox label="output" value={t.schema.output} />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px] text-muted-foreground">
                            <span>Kategori: <span className="text-foreground/80">{CATEGORY_LABEL[t.category]}</span></span>
                            <span>Kayıt: <span className="text-foreground/80">{t.registeredISO}</span></span>
                            <span>Tarafından: <span className="text-foreground/80">{t.registeredBy}</span></span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {registryFiltered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    <Wrench className="mx-auto mb-2 h-5 w-5" />
                    Bu filtrelerle eşleşen tool yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  )
}

function SchemaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11.5px] leading-relaxed text-foreground/85">
{value}
      </pre>
    </div>
  )
}

function Stat({ label, value, hint, mono }: { label: string; value: string; hint: string; mono?: boolean }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-light tabular-nums', mono ? 'font-mono text-base' : 'font-serif')}>{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}
