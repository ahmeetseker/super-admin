// Wave F21.C — KVKK tenant delete workflow.
//
// 4-step state machine:
//   1. preview     — tenant seç + CascadePreviewCard
//   2. confirm     — type-to-confirm: "SİL <tenant.name>" tam eşleşmeli
//   3. countdown   — 3 saniye geri sayım; "Vazgeç" butonu setInterval'i temizler
//   4. done        — createRequest + completeRequest audit hop, success banner
//
// Storage tarafı `lib/data-rights` üzerinden. Bu komponent gerçek silme
// yapmaz — F22+ backend hop'unda gerçek mutation devralır.

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronRight, X } from '@landx/icons'
import { TENANTS, type Tenant } from '@landx/data'
import {
  completeRequest,
  createRequest,
  previewCascade,
} from '@/lib/data-rights'
import { CascadePreviewCard } from '@/components/data-rights/CascadePreviewCard'

type Step = 'preview' | 'confirm' | 'countdown' | 'done'

interface DeleteWorkflowProps {
  /** Override the 3-second countdown for tests (defaults to 3). */
  countdownSeconds?: number
  /** Override the tick interval (ms) for tests (defaults to 1000). */
  tickMs?: number
  /** Fires when the workflow lands a completed request — for parent refresh. */
  onCompleted?: (req: { id: string; tenantId: string }) => void
}

function confirmPhrase(tenant: Pick<Tenant, 'name'>): string {
  return `SİL ${tenant.name}`
}

export function DeleteWorkflow({
  countdownSeconds = 3,
  tickMs = 1000,
  onCompleted,
}: DeleteWorkflowProps) {
  const tenants = TENANTS as readonly Tenant[]
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('preview')
  const [tenantId, setTenantId] = useState<string>(tenants[0]?.id ?? '')
  const [confirmText, setConfirmText] = useState('')
  const [counter, setCounter] = useState<number>(countdownSeconds)
  const [completedTenant, setCompletedTenant] = useState<string | null>(null)

  const tenant = useMemo(
    () => tenants.find((t) => t.id === tenantId) ?? null,
    [tenants, tenantId],
  )

  const expectedPhrase = tenant ? confirmPhrase(tenant) : ''
  const phraseMatches = expectedPhrase.length > 0 && confirmText === expectedPhrase

  // Countdown setInterval — cleanup on unmount/step change.
  useEffect(() => {
    if (step !== 'countdown') return
    if (counter <= 0) return
    const id = window.setInterval(() => {
      setCounter((c) => c - 1)
    }, tickMs)
    return () => window.clearInterval(id)
  }, [step, counter, tickMs])

  // When the countdown hits 0, transition to done + commit the request.
  useEffect(() => {
    if (step !== 'countdown') return
    if (counter > 0) return
    if (!tenant) return
    const req = createRequest({
      kind: 'delete',
      tenantId: tenant.id,
      requestedBy: 'ops@arsam.local',
      notes: 'KVKK silme talebi — F21.C 4-step workflow',
    })
    const completed = completeRequest(req.id) ?? req
    setCompletedTenant(tenant.id)
    setStep('done')
    onCompleted?.({ id: completed.id, tenantId: completed.tenantId })
  }, [step, counter, tenant, onCompleted])

  const reset = () => {
    setOpen(false)
    setStep('preview')
    setConfirmText('')
    setCounter(countdownSeconds)
    setCompletedTenant(null)
    setTenantId(tenants[0]?.id ?? '')
  }

  if (!open) {
    return (
      <section
        data-testid="delete-workflow-collapsed"
        aria-labelledby="delete-workflow-heading"
        className="rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              id="delete-workflow-heading"
              className="font-serif text-base tracking-tight"
            >
              KVKK tenant silme
            </h3>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              4 adımlı geri alınamaz akış: önizleme, doğrulama, geri sayım, kayıt.
            </p>
          </div>
          <button
            type="button"
            data-testid="delete-workflow-start"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Silme talebi başlat
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      data-testid="delete-workflow"
      data-step={step}
      aria-labelledby="delete-workflow-heading"
      className="rounded-2xl border border-rose-500/30 bg-card p-4"
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose-600 dark:text-rose-300">
            KVKK · Tenant silme · Adım {step === 'preview' ? 1 : step === 'confirm' ? 2 : step === 'countdown' ? 3 : 4} / 4
          </p>
          <h3
            id="delete-workflow-heading"
            className="font-serif text-base tracking-tight"
          >
            Silme talebi
          </h3>
        </div>
        <button
          type="button"
          aria-label="Akışı kapat"
          data-testid="delete-workflow-close"
          onClick={reset}
          className="rounded-lg p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {step === 'preview' && (
        <div data-testid="delete-step-preview" className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="delete-tenant"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Tenant
            </label>
            <select
              id="delete-tenant"
              data-testid="delete-tenant-select"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.id}
                </option>
              ))}
            </select>
          </div>
          {tenant && <CascadePreviewCard preview={previewCascade(tenant.id)} />}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              data-testid="delete-step-preview-next"
              onClick={() => setStep('confirm')}
              disabled={!tenant}
              className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Devam et
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && tenant && (
        <div data-testid="delete-step-confirm" className="flex flex-col gap-3">
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-700 dark:text-rose-300">
            Bu işlemi geri alamazsınız. Devam etmek için aşağıdaki ifadeyi büyük/küçük harf uyumlu şekilde yazın.
          </p>
          <div>
            <label
              htmlFor="delete-confirm"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Doğrulama — <span className="text-foreground">{expectedPhrase}</span>
            </label>
            <input
              id="delete-confirm"
              type="text"
              data-testid="delete-confirm-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              placeholder={expectedPhrase}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none placeholder:text-[hsl(var(--placeholder))] focus:border-foreground"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              data-testid="delete-step-confirm-back"
              onClick={() => {
                setStep('preview')
                setConfirmText('')
              }}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
            >
              Geri
            </button>
            <button
              type="button"
              data-testid="delete-step-confirm-next"
              disabled={!phraseMatches}
              onClick={() => {
                setCounter(countdownSeconds)
                setStep('countdown')
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Doğrula ve devam et
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {step === 'countdown' && tenant && (
        <div data-testid="delete-step-countdown" className="flex flex-col gap-3">
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-700 dark:text-rose-300">
            Silme talebi <span className="font-mono">{counter}</span> saniye içinde işlenecek.
            İptal etmek için "Vazgeç" butonuna basın.
          </p>
          <div
            data-testid="delete-countdown-display"
            data-counter={counter}
            className="rounded-xl border border-border bg-background p-6 text-center"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Geri sayım
            </p>
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-foreground">
              {counter}…
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              data-testid="delete-step-countdown-cancel"
              onClick={() => {
                setStep('preview')
                setCounter(countdownSeconds)
                setConfirmText('')
              }}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div data-testid="delete-step-done" className="flex flex-col gap-3">
          <p
            role="status"
            data-testid="delete-success-banner"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-[13px] text-emerald-700 dark:text-emerald-300"
          >
            Tenant silme talebi gönderildi. {completedTenant ? `(${completedTenant})` : ''}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              data-testid="delete-step-done-close"
              onClick={reset}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default DeleteWorkflow
