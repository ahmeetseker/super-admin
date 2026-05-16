// Wave F21.C — Cascade preview card.
//
// Read-only summary of "what gets touched" when a tenant deletion is committed.
// Renders the six counts produced by `previewCascade` (customers, listings,
// transactions, audit entries, storage MB, db rows) alongside a KVKK warning
// note about the audit log entry that the workflow will append.
//
// Pure presentation — the lib computes the numbers.

import { AlertTriangle } from '@landx/icons'
import type { CascadePreview } from '@/lib/data-rights'

interface CascadePreviewCardProps {
  preview: CascadePreview
}

const FORMATTER = new Intl.NumberFormat('tr-TR')

function format(n: number): string {
  return FORMATTER.format(n)
}

interface Metric {
  key: string
  label: string
  value: string
}

function metrics(preview: CascadePreview): Metric[] {
  return [
    { key: 'customers', label: 'Müşteri', value: format(preview.customers) },
    { key: 'listings', label: 'İlan', value: format(preview.listings) },
    { key: 'transactions', label: 'İşlem', value: format(preview.transactions) },
    { key: 'audit', label: 'Audit girdisi', value: format(preview.auditEntries) },
    { key: 'storage', label: 'Depolama (MB)', value: format(preview.storageMb) },
    { key: 'db', label: 'DB satırı', value: format(preview.dbRows) },
  ]
}

export function CascadePreviewCard({ preview }: CascadePreviewCardProps) {
  const rows = metrics(preview)
  return (
    <section
      data-testid="cascade-preview-card"
      data-tenant-id={preview.tenant.id}
      aria-label="Silme cascade önizlemesi"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <header className="mb-3 flex items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Tenant · {preview.tenant.id}
          </p>
          <h3 className="font-serif text-base tracking-tight">{preview.tenant.name}</h3>
        </div>
      </header>

      <ul
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        role="list"
        aria-label="Silinecek kayıt sayıları"
      >
        {rows.map((row) => (
          <li
            key={row.key}
            data-testid={`cascade-metric-${row.key}`}
            className="rounded-xl border border-border bg-background p-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {row.label}
            </p>
            <p
              data-testid={`cascade-value-${row.key}`}
              className="mt-1 font-mono text-lg font-semibold tabular-nums"
            >
              {row.value}
            </p>
          </li>
        ))}
      </ul>

      <p
        data-testid="cascade-kvkk-warning"
        className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12.5px] text-amber-700 dark:text-amber-300"
      >
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden />
        <span>
          KVKK uyumluluğu için silme talebi sırasında bir audit log girdisi oluşturulacak.
          İşlem geri alınamaz.
        </span>
      </p>
    </section>
  )
}

export default CascadePreviewCard
