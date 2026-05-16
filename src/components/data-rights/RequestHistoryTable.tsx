// Wave F21.C — Data-rights request history table.
//
// `listRequests()` already sorts descending by `requestedISO`. Rendered as a
// compact table with status pill, request type pill, tenant, requester, and
// completion timestamp. Filterable by kind (all/export/delete) — the lib's
// raw list is the canonical source so the filter is a thin client overlay.

import { useMemo, useState } from 'react'
import { listRequests, type DataRightsKind, type DataRightsRequest, type DataRightsStatus } from '@/lib/data-rights'

interface RequestHistoryTableProps {
  /** Optional injected rows for tests. Defaults to `listRequests()`. */
  rows?: readonly DataRightsRequest[]
}

const STATUS_PILL: Record<DataRightsStatus, string> = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  preview: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  completed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  cancelled: 'border-stone-400/50 bg-stone-400/10 text-stone-600 dark:text-stone-300',
}

const STATUS_LABEL: Record<DataRightsStatus, string> = {
  pending: 'Beklemede',
  preview: 'Önizleme',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

const KIND_LABEL: Record<DataRightsKind, string> = {
  export: 'Export',
  delete: 'Silme',
}

const KIND_PILL: Record<DataRightsKind, string> = {
  export: 'border-border bg-background text-foreground',
  delete: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

type KindFilter = 'all' | DataRightsKind

function formatTs(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function RequestHistoryTable({ rows }: RequestHistoryTableProps) {
  const source = useMemo<readonly DataRightsRequest[]>(
    () => rows ?? listRequests(),
    [rows],
  )
  const [kind, setKind] = useState<KindFilter>('all')

  const filtered = useMemo(() => {
    if (kind === 'all') return source
    return source.filter((r) => r.kind === kind)
  }, [source, kind])

  return (
    <section
      data-testid="request-history-table"
      aria-labelledby="request-history-heading"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3
            id="request-history-heading"
            className="font-serif text-base tracking-tight"
          >
            Talep geçmişi
          </h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {filtered.length} kayıt · en yeni üstte
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Tipe göre filtre"
          className="inline-flex rounded-lg border border-border bg-background p-0.5 font-mono text-[10px] uppercase tracking-[0.14em]"
        >
          {(['all', 'export', 'delete'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              role="tab"
              aria-selected={kind === opt}
              data-testid={`request-history-filter-${opt}`}
              onClick={() => setKind(opt)}
              className={`rounded px-2.5 py-1 transition ${
                kind === opt
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt === 'all' ? 'Tümü' : KIND_LABEL[opt]}
            </button>
          ))}
        </div>
      </header>

      {filtered.length === 0 ? (
        <div
          data-testid="request-history-empty"
          className="rounded-xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground"
        >
          Henüz talep yok.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-2 py-2">Talep zamanı</th>
                <th scope="col" className="px-2 py-2">Tip</th>
                <th scope="col" className="px-2 py-2">Tenant</th>
                <th scope="col" className="px-2 py-2">Talep eden</th>
                <th scope="col" className="px-2 py-2">Durum</th>
                <th scope="col" className="px-2 py-2">Tamamlanma</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  data-testid={`request-history-row-${row.id}`}
                  data-kind={row.kind}
                  data-status={row.status}
                  className="border-t border-border"
                >
                  <td className="px-2 py-2 font-mono text-[12px] tabular-nums">
                    {formatTs(row.requestedISO)}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] ${KIND_PILL[row.kind]}`}
                    >
                      {KIND_LABEL[row.kind]}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{row.tenantName}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {row.tenantId}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 font-mono text-[12px] text-muted-foreground">
                    {row.requestedBy}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      data-testid={`request-history-status-${row.id}`}
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] ${STATUS_PILL[row.status]}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-mono text-[12px] tabular-nums text-muted-foreground">
                    {formatTs(row.completedISO)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default RequestHistoryTable
