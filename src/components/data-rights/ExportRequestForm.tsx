// Wave F21.C — GDPR data export form.
//
// Tenant seçici → `buildExportBundle(tenantId)` ile JSON bundle hazırlanır →
// preview kart (filename + byte size + counts) gösterilir → "İndir" butonu
// native Blob download yapar ve `createRequest` + `completeRequest`
// çağrılarıyla `arsam.platform-data-rights.v1` audit trail'ine yazılır.

import { useState } from 'react'
import { Download, FileJson } from '@landx/icons'
import { TENANTS, type Tenant } from '@landx/data'
import {
  buildExportBundle,
  completeRequest,
  createRequest,
  previewCascade,
  type CascadePreview,
} from '@/lib/data-rights'

interface ExportRequestFormProps {
  /** Override the navigator-driven Blob download (tests). */
  onDownload?: (bundle: { filename: string; bytes: string }) => void
  /** Override the request creation/audit hop (tests). */
  onCommitted?: (req: { id: string; tenantId: string }) => void
}

interface PreviewState {
  tenantId: string
  bundle: { filename: string; bytes: string }
  preview: CascadePreview
}

const BYTE_FORMATTER = new Intl.NumberFormat('tr-TR')

function formatBytes(n: number): string {
  if (n < 1024) return `${BYTE_FORMATTER.format(n)} B`
  if (n < 1024 * 1024) return `${BYTE_FORMATTER.format(Math.round(n / 1024))} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function defaultDownload(bundle: { filename: string; bytes: string }): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  try {
    const blob = new Blob([bundle.bytes], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = bundle.filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    /* DOM unavailable — caller passed no override, swallow */
  }
}

export function ExportRequestForm({ onDownload, onCommitted }: ExportRequestFormProps) {
  const tenants = TENANTS as readonly Tenant[]
  const [tenantId, setTenantId] = useState<string>(tenants[0]?.id ?? '')
  const [state, setState] = useState<PreviewState | null>(null)
  const [status, setStatus] = useState<'idle' | 'preview' | 'completed'>('idle')

  const handlePreview = () => {
    if (!tenantId) return
    const bundle = buildExportBundle(tenantId)
    const preview = previewCascade(tenantId)
    setState({ tenantId, bundle, preview })
    setStatus('preview')
  }

  const handleDownload = () => {
    if (!state) return
    if (onDownload) {
      onDownload(state.bundle)
    } else {
      defaultDownload(state.bundle)
    }
    const req = createRequest({
      kind: 'export',
      tenantId: state.tenantId,
      requestedBy: 'ops@arsam.local',
    })
    const completed = completeRequest(req.id) ?? req
    onCommitted?.({ id: completed.id, tenantId: completed.tenantId })
    setStatus('completed')
  }

  const handleReset = () => {
    setState(null)
    setStatus('idle')
  }

  const byteSize = state ? new Blob([state.bundle.bytes]).size : 0

  return (
    <section
      data-testid="export-request-form"
      aria-labelledby="export-request-heading"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <header className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h3
            id="export-request-heading"
            className="font-serif text-base tracking-tight"
          >
            GDPR veri ihracı
          </h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Tenant başına JSON bundle · Article 20
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="export-tenant"
            className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            Tenant
          </label>
          <select
            id="export-tenant"
            data-testid="export-tenant-select"
            value={tenantId}
            onChange={(e) => {
              setTenantId(e.target.value)
              setState(null)
              setStatus('idle')
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.id}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handlePreview}
          data-testid="export-preview-button"
          disabled={!tenantId}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FileJson className="h-4 w-4" aria-hidden />
          Önizleme oluştur
        </button>
      </div>

      {state && (
        <div
          data-testid="export-preview-card"
          className="mt-4 rounded-xl border border-border bg-background p-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Dosya
              </p>
              <p
                data-testid="export-filename"
                className="mt-0.5 truncate font-mono text-[12.5px] text-foreground"
                title={state.bundle.filename}
              >
                {state.bundle.filename}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Boyut
              </p>
              <p
                data-testid="export-size"
                className="mt-0.5 font-mono text-[12.5px] tabular-nums text-foreground"
              >
                {formatBytes(byteSize)}
              </p>
            </div>
          </div>
          <ul
            className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
            role="list"
            aria-label="Bundle içeriği"
          >
            <li
              data-testid="export-count-customers"
              className="rounded-lg border border-border bg-card px-2.5 py-1.5"
            >
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                Müşteri
              </p>
              <p className="font-mono text-sm tabular-nums">{state.preview.customers}</p>
            </li>
            <li
              data-testid="export-count-listings"
              className="rounded-lg border border-border bg-card px-2.5 py-1.5"
            >
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                İlan
              </p>
              <p className="font-mono text-sm tabular-nums">{state.preview.listings}</p>
            </li>
            <li
              data-testid="export-count-audit"
              className="rounded-lg border border-border bg-card px-2.5 py-1.5"
            >
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                Audit
              </p>
              <p className="font-mono text-sm tabular-nums">{state.preview.auditEntries}</p>
            </li>
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleReset}
              data-testid="export-reset-button"
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-foreground/5"
            >
              Sıfırla
            </button>
            <button
              type="button"
              onClick={handleDownload}
              data-testid="export-download-button"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              İndir
            </button>
          </div>
          {status === 'completed' && (
            <p
              data-testid="export-status-completed"
              role="status"
              className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-700 dark:text-emerald-300"
            >
              Export tamamlandı. Audit trail güncellendi.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export default ExportRequestForm
