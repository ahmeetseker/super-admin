// Wave F12.D — /ops/vector-store route.
// Composes StatsCards + DistributionChart + CollectionList with live reindex
// status updates via subscribeCollections.
import { useEffect, useMemo, useState } from 'react'
import { Download } from '@landx/icons'
import { PageShell } from '@landx/ui'
import {
  getCollections,
  subscribeCollections,
  computeVectorStats,
  formatBytes,
  STATUS_LABEL,
  METRIC_LABEL,
  type VectorCollection,
} from '@/lib/platform-vector'
import {
  toCsv,
  downloadCsv,
  todayStamp,
  type CsvColumn,
} from '@/lib/super-admin-chart-export'
import { StatsCards } from '@/components/vector-store/StatsCards'
import { DistributionChart } from '@/components/vector-store/DistributionChart'
import { CollectionList } from '@/components/vector-store/CollectionList'

const CSV_COLUMNS: CsvColumn<VectorCollection>[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Ad' },
  { key: 'vectorCount', label: 'Vektör' },
  { key: 'dimension', label: 'Boyut' },
  {
    key: 'distanceMetric',
    label: 'Metrik',
    getValue: (r) => METRIC_LABEL[r.distanceMetric],
  },
  {
    key: 'indexSize',
    label: 'İndeks (B)',
    getValue: (r) => r.indexSize,
  },
  {
    key: 'indexSizeHuman',
    label: 'İndeks (insancıl)',
    getValue: (r) => formatBytes(r.indexSize),
  },
  { key: 'status', label: 'Durum', getValue: (r) => STATUS_LABEL[r.status] },
  {
    key: 'lastReindexedAt',
    label: 'Son indeks',
    getValue: (r) => new Date(r.lastReindexedAt).toISOString(),
  },
  { key: 'modelEmbedding', label: 'Embedding modeli' },
]

export function VectorStore() {
  // Reactive snapshot — re-read whenever the store dispatches a change event
  // (reindex transitions). Avoids useSyncExternalStore overhead since we just
  // need a simple force-update.
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const unsubscribe = subscribeCollections(() => setTick((t) => t + 1))
    return unsubscribe
  }, [])

  const collections = useMemo(
    () => getCollections(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  )
  const stats = useMemo(() => computeVectorStats(collections), [collections])
  const reindexingCount = useMemo(
    () => collections.filter((c) => c.status === 'reindexing').length,
    [collections],
  )

  function handleExport() {
    const csv = toCsv(collections, CSV_COLUMNS)
    downloadCsv(`vector-store-${todayStamp()}.csv`, csv)
  }

  return (
    <PageShell
      eyebrow="MOD · A05 · VECTOR STORE"
      title={
        <>
          Vektör <em className="font-serif italic font-light">depo</em>
        </>
      }
      description={`${stats.totalCollections} koleksiyon · ${stats.totalVectors.toLocaleString(
        'tr-TR',
      )} vektör · ${formatBytes(stats.totalIndexSizeBytes)} indeks.`}
    >
      <StatsCards stats={stats} reindexingCount={reindexingCount} />

      <div className="mb-5 flex items-center justify-end">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04]"
          data-testid="vector-export-csv"
        >
          <Download className="h-3 w-3" /> CSV dışa aktar
        </button>
      </div>

      <div className="mb-5">
        <DistributionChart collections={collections} />
      </div>

      <CollectionList collections={collections} />
    </PageShell>
  )
}
