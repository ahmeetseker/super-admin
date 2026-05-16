// Wave F12.D — /ops/memory-layer route.
// Composes StatsCards + FilterBar + EntryList + EntryDrawer.
// CSV export via shared chart-export helper.
import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Download } from '@landx/icons'
import { PageShell } from '@landx/ui'
import {
  getMemoryEntries,
  filterEntries,
  computeStats,
  TYPE_LABEL,
  SCOPE_LABEL,
  type MemoryEntry,
} from '@/lib/platform-memory'
import { createPresetRange } from '@/lib/super-admin-time-range'
import {
  toCsv,
  downloadCsv,
  todayStamp,
  type CsvColumn,
} from '@/lib/super-admin-chart-export'
import { StatsCards } from '@/components/memory-layer/StatsCards'
import { FilterBar, type MemoryFilterValue } from '@/components/memory-layer/FilterBar'
import { EntryList } from '@/components/memory-layer/EntryList'
import { EntryDrawer } from '@/components/memory-layer/EntryDrawer'

const CSV_COLUMNS: CsvColumn<MemoryEntry>[] = [
  { key: 'id', label: 'ID' },
  { key: 'type', label: 'Tip', getValue: (r) => TYPE_LABEL[r.type] },
  { key: 'scope', label: 'Scope', getValue: (r) => SCOPE_LABEL[r.scope] },
  { key: 'agentId', label: 'Agent' },
  { key: 'tenantId', label: 'Tenant', getValue: (r) => r.tenantId ?? '' },
  { key: 'accessCount', label: 'Erişim' },
  { key: 'ageDays', label: 'Yaş (gün)' },
  {
    key: 'createdAt',
    label: 'Oluşturuldu',
    getValue: (r) => new Date(r.createdAt).toISOString(),
  },
  { key: 'content', label: 'İçerik' },
]

export function MemoryLayer() {
  // 90d default — Memory entries span 90 days.
  const [filter, setFilter] = useState<MemoryFilterValue>(() => ({
    range: createPresetRange('90d'),
    type: 'all',
    scope: 'all',
    agentId: 'all',
  }))
  const [refreshKey, setRefreshKey] = useState(0)
  const [selected, setSelected] = useState<MemoryEntry | null>(null)

  // refreshKey forces re-derivation of filtered list (useful when consumer
  // wants a manual refresh — entries themselves are deterministic).
  const allEntries = useMemo(() => getMemoryEntries(), [])
  const filtered = useMemo(
    () => filterEntries(allEntries, filter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allEntries, filter, refreshKey],
  )
  const stats = useMemo(() => computeStats(filtered), [filtered])

  function handleExport() {
    const csv = toCsv(filtered, CSV_COLUMNS)
    downloadCsv(`memory-layer-${todayStamp()}.csv`, csv)
  }

  return (
    <PageShell
      eyebrow="MOD · A04 · AGENT MEMORY"
      title={
        <>
          Bellek <em className="font-serif italic font-light">katmanı</em>
        </>
      }
      description={`${stats.totalEntries.toLocaleString('tr-TR')} kayıt · ${
        Object.keys(stats.byAgent).length
      } agent · hit rate %${(stats.hitRate * 100).toFixed(1)}.`}
    >
      <StatsCards stats={stats} />

      <section className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-rose-600 dark:text-rose-400" />
        <div className="flex-1 text-[13px] leading-relaxed text-foreground/80">
          <strong className="font-medium text-foreground">KVKK kapsamında.</strong>{' '}
          Memory layer kişisel verilerle çalışır. Kullanıcı silme talebinde{' '}
          <span className="font-mono text-[11px]">scope='tenant'</span> kayıtları
          forget edilir; bunlar audit log&apos;a düşer.
        </div>
        <a
          href="/compliance"
          className="inline-flex flex-none items-center gap-1 self-center font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/80 hover:text-foreground"
        >
          Saklama politikası <ArrowRight className="h-3 w-3" />
        </a>
      </section>

      <FilterBar
        value={filter}
        onChange={setFilter}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {filtered.length.toLocaleString('tr-TR')} kayıt
        </span>
        <button
          type="button"
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="memory-export-csv"
        >
          <Download className="h-3 w-3" /> CSV dışa aktar
        </button>
      </div>

      <EntryList
        entries={filtered}
        onSelect={setSelected}
        selectedId={selected?.id}
      />

      <EntryDrawer entry={selected} onClose={() => setSelected(null)} />
    </PageShell>
  )
}
