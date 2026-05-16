// Wave F12.C — Prompt library analytics + diff comparison.
// Refactored from the F10.B card-grid view into a list + version detail + diff
// workflow. Driven by the deterministic platform-prompts seed (15 prompts ×
// 3-5 versions). Shared TimeRangePicker + chart-export.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, FileCode } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'

import FilterBar, { type PromptStatusFilter } from '@/components/prompts/FilterBar'
import PromptList from '@/components/prompts/PromptList'
import VersionDetail from '@/components/prompts/VersionDetail'
import DiffViewer from '@/components/prompts/DiffViewer'

import {
  getPromptGroups,
  type PromptGroup,
} from '@/lib/platform-prompts'
import {
  createPresetRange,
  inRange,
  type TimeRange,
} from '@/lib/super-admin-time-range'
import { downloadCsv, todayStamp, toCsv } from '@/lib/super-admin-chart-export'

export function Prompts() {
  const [range, setRange] = useState<TimeRange>(() => createPresetRange('30d'))
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PromptStatusFilter>('all')
  const [refreshTick, setRefreshTick] = useState(0)
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [leftVersionId, setLeftVersionId] = useState<string | null>(null)
  const [rightVersionId, setRightVersionId] = useState<string | null>(null)

  const allGroups = useMemo(() => {
    void refreshTick // re-derive on refresh
    return getPromptGroups()
  }, [refreshTick])

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return allGroups.filter((g) => {
      if (!inRange(g.lastUsedAtMs, range)) return false
      if (statusFilter !== 'all' && g.activeVersion.status !== statusFilter) return false
      if (needle && !g.name.toLowerCase().includes(needle)) return false
      return true
    })
  }, [allGroups, range, query, statusFilter])

  const totalPrompts = allGroups.length
  const totalVersions = useMemo(
    () => allGroups.reduce((s, g) => s + g.versions.length, 0),
    [allGroups],
  )
  const totalUsage = useMemo(
    () => allGroups.reduce((s, g) => s + g.totalUsage, 0),
    [allGroups],
  )
  const activeCount = useMemo(
    () => allGroups.filter((g) => g.activeVersion.status === 'active').length,
    [allGroups],
  )

  const selectedGroup: PromptGroup | undefined = useMemo(
    () => allGroups.find((g) => g.promptId === selectedPromptId),
    [allGroups, selectedPromptId],
  )

  // When selectedPromptId changes (or first becomes set), seed left=v1.0,
  // right=active. This is also the path the E2E spec walks.
  useEffect(() => {
    if (!selectedGroup) return
    const v1 = selectedGroup.versions[0]
    const active = selectedGroup.activeVersion
    setLeftVersionId(v1.id)
    setRightVersionId(active.id)
  }, [selectedGroup])

  // Auto-select first filtered prompt if nothing is selected yet — keeps the
  // detail/diff panel populated on first render.
  useEffect(() => {
    if (selectedPromptId) return
    if (filteredGroups.length === 0) return
    setSelectedPromptId(filteredGroups[0].promptId)
  }, [filteredGroups, selectedPromptId])

  const handleRefresh = useCallback(() => setRefreshTick((n) => n + 1), [])

  const handleCsvExport = useCallback(() => {
    const csv = toCsv(filteredGroups, [
      { key: 'name', label: 'Prompt' },
      { key: 'activeVersion', label: 'Aktif sürüm', getValue: (g) => g.activeVersion.version },
      { key: 'status', label: 'Durum', getValue: (g) => g.activeVersion.status },
      { key: 'versionCount', label: 'Sürüm sayısı', getValue: (g) => g.versions.length },
      { key: 'totalUsage', label: 'Toplam kullanım' },
      { key: 'lastUsed', label: 'Son kullanım', getValue: (g) => new Date(g.lastUsedAtMs).toISOString() },
    ])
    downloadCsv(`prompts-${todayStamp()}.csv`, csv)
  }, [filteredGroups])

  const leftVersion = selectedGroup && leftVersionId
    ? selectedGroup.versions.find((v) => v.id === leftVersionId)
    : undefined
  const rightVersion = selectedGroup && rightVersionId
    ? selectedGroup.versions.find((v) => v.id === rightVersionId)
    : undefined

  return (
    <PageShell
      eyebrow="MOD · A06 · PROMPT LIBRARY"
      title={
        <>
          Prompt <em className="font-serif italic font-light">sürüm yönetimi</em>
        </>
      }
      description={`${totalPrompts} prompt · ${totalVersions} sürüm · ${activeCount} aktif · ${totalUsage.toLocaleString('tr-TR')} kullanım.`}
      actions={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Yeni prompt oluştur
        </button>
      }
    >
      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="prompts-kpi-row">
        <Stat label="Prompt" value={String(totalPrompts)} hint="seed katalog" />
        <Stat label="Sürüm" value={String(totalVersions)} hint="tüm tarih" />
        <Stat label="Aktif" value={String(activeCount)} hint="canlı kullanım" />
        <Stat label="Kullanım" value={totalUsage.toLocaleString('tr-TR')} hint="toplam çağrı" />
      </section>

      <FilterBar
        range={range}
        onRangeChange={setRange}
        query={query}
        onQueryChange={setQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onRefresh={handleRefresh}
        onCsvExport={handleCsvExport}
      />

      <div className="mb-6">
        <h2 className="mb-3 font-serif text-base font-light tracking-tight">
          Prompt kataloğu ({filteredGroups.length} / {totalPrompts})
        </h2>
        <PromptList
          groups={filteredGroups}
          selectedId={selectedPromptId}
          onSelect={setSelectedPromptId}
        />
      </div>

      {selectedGroup && leftVersionId && rightVersionId && (
        <div className="mb-6" data-testid="prompts-detail-section">
          <h2 className="mb-3 flex items-center gap-2 font-serif text-base font-light tracking-tight">
            <FileCode className="h-4 w-4 text-muted-foreground" />
            {selectedGroup.name}
            <span className="font-mono text-[11px] text-muted-foreground">
              · {selectedGroup.versions.length} sürüm
            </span>
          </h2>
          <VersionDetail
            group={selectedGroup}
            leftVersionId={leftVersionId}
            rightVersionId={rightVersionId}
            onLeftChange={setLeftVersionId}
            onRightChange={setRightVersionId}
          />
          {leftVersion && rightVersion && (
            <DiffViewer left={leftVersion} right={rightVersion} />
          )}
        </div>
      )}
    </PageShell>
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
