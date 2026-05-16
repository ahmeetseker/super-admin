// Wave F13.B — Tenant suspend modal with type-to-confirm guard.
// Persists a minimal status override into localStorage under
// `arsam.platform-tenants-overrides.v1` so the UI can reflect the suspend
// outcome without touching the read-only @landx/data seed. The orchestration
// of "platform-tenants storage" is owned by a future wave; we deliberately keep
// the override surface tiny (id → status) until that lands.

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, X } from '@landx/icons'

const CONFIRM_WORD = 'SUSPEND'
export const TENANT_STATUS_OVERRIDE_KEY = 'arsam.platform-tenants-overrides.v1'

export interface SuspendModalProps {
  /** One or more tenant ids to suspend. */
  tenantIds: string[]
  /** Display label for the (first) tenant — shown for context. Optional in bulk. */
  tenantLabel?: string
  onClose: () => void
  onSuspended?: (tenantIds: string[]) => void
}

interface TenantStatusOverride {
  status: 'suspended'
  suspendedAt: number
}

type OverrideMap = Record<string, TenantStatusOverride>

function readOverrides(): OverrideMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(TENANT_STATUS_OVERRIDE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as OverrideMap
  } catch {
    return {}
  }
}

function writeOverrides(next: OverrideMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TENANT_STATUS_OVERRIDE_KEY, JSON.stringify(next))
  } catch {
    /* quota / privacy mode — swallow */
  }
}

export function suspendTenants(tenantIds: string[]): void {
  const overrides = readOverrides()
  const now = Date.now()
  for (const id of tenantIds) {
    overrides[id] = { status: 'suspended', suspendedAt: now }
  }
  writeOverrides(overrides)
}

export function getSuspendedTenantIds(): string[] {
  return Object.entries(readOverrides())
    .filter(([, v]) => v?.status === 'suspended')
    .map(([id]) => id)
}

export function SuspendModal({
  tenantIds,
  tenantLabel,
  onClose,
  onSuspended,
}: SuspendModalProps) {
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const bulk = tenantIds.length > 1

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const canSubmit = useMemo(
    () => confirm.trim() === CONFIRM_WORD && tenantIds.length > 0 && !busy,
    [confirm, tenantIds.length, busy],
  )

  const handleSubmit = () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      suspendTenants(tenantIds)
      onSuspended?.(tenantIds)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hesap askıya alma onayı"
      data-testid="suspend-modal"
      className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <section
        className="w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300"
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <h3 className="font-serif text-lg">
              {bulk
                ? `${tenantIds.length} hesap askıya alınacak`
                : `${tenantLabel ?? tenantIds[0]} askıya alınacak`}
            </h3>
            <p className="text-sm text-muted-foreground">
              Yıkıcı işlem: kullanıcılar oturum açamaz, ilan yayını durur. Geri almak için
              destekle iletişime geçilir.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mt-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2 font-mono text-[11px] text-muted-foreground">
          Etkilenen:{' '}
          <span className="text-foreground">
            {tenantIds.slice(0, 4).join(', ')}
            {tenantIds.length > 4 ? ` ve ${tenantIds.length - 4} daha` : ''}
          </span>
        </div>

        <label
          htmlFor="suspend-confirm"
          className="mb-1 mt-4 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          DOĞRULAMA — "{CONFIRM_WORD}" yazın
        </label>
        <input
          id="suspend-confirm"
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          data-testid="suspend-confirm-input"
          placeholder={CONFIRM_WORD}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none placeholder:text-[hsl(var(--placeholder))] focus:border-foreground"
        />

        <footer className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="suspend-submit"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Askıya al
          </button>
        </footer>
      </section>
    </div>
  )
}

export default SuspendModal
