// Wave F21.B — CIDR ekleme modali.
// Tenant scope'unda izinli IP aralığı ekler. isValidCidr ile inline validation,
// cidrSize ile canlı "kaç IP" önizlemesi. Submit → addAllowEntry (F21.0 lib).

import { useEffect, useMemo, useState } from 'react'
import { X } from '@landx/icons'
import { type Tenant } from '@landx/data'
import {
  addAllowEntry,
  cidrSize,
  isValidCidr,
} from '@/lib/ip-allowlist'

export const ADD_CIDR_MODAL_OPERATOR = 'ops@arsam.local'

export interface AddCidrModalProps {
  tenant: Tenant
  onClose: () => void
  onAdded?: () => void
}

function fmtSize(n: number): string {
  return n === 1 ? '1 IP' : `${n.toLocaleString('tr-TR')} IP`
}

export function AddCidrModal({ tenant, onClose, onAdded }: AddCidrModalProps) {
  const [cidr, setCidr] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const trimmed = cidr.trim()
  const cidrValid = useMemo(() => isValidCidr(trimmed), [trimmed])
  const size = useMemo(() => (cidrValid ? cidrSize(trimmed) : 0), [
    trimmed,
    cidrValid,
  ])
  const canSubmit = cidrValid && !busy

  const handleSubmit = () => {
    if (!canSubmit) {
      if (!cidrValid) setError('Geçerli bir CIDR girin (örn. 10.0.0.0/24).')
      return
    }
    setError(null)
    setBusy(true)
    try {
      addAllowEntry({
        tenantId: tenant.id,
        cidr: trimmed,
        label: label.trim() || undefined,
        createdBy: ADD_CIDR_MODAL_OPERATOR,
      })
      onAdded?.()
      onClose()
    } catch (err) {
      setError((err as Error).message ?? 'CIDR eklenemedi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CIDR ekle"
      data-testid="add-cidr-modal"
      className="fixed inset-0 z-50 grid place-items-center bg-background/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <section
        className="w-[min(540px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              IP ALLOWLIST · YENİ KAYIT
            </div>
            <h3 className="font-serif text-lg">CIDR ekle</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {tenant.name} ({tenant.id}) tenant'ına izinli IP aralığı ekleyin.
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

        <div className="space-y-4">
          <div>
            <label
              htmlFor="add-cidr-input"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              CIDR
            </label>
            <input
              id="add-cidr-input"
              type="text"
              data-testid="add-cidr-input"
              value={cidr}
              onChange={(e) => {
                setCidr(e.target.value)
                if (error) setError(null)
              }}
              placeholder="10.0.0.0/24 veya 192.168.1.5/32"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-foreground"
            />
            <div className="mt-1 flex items-center justify-between text-[11px]">
              {trimmed.length === 0 ? (
                <span className="text-muted-foreground">
                  IPv4 CIDR — /0 ile /32 arası mask.
                </span>
              ) : cidrValid ? (
                <span
                  data-testid="add-cidr-size"
                  className="text-emerald-600 dark:text-emerald-400"
                >
                  Geçerli · {fmtSize(size)} kapsar.
                </span>
              ) : (
                <span
                  data-testid="add-cidr-invalid"
                  className="text-rose-600 dark:text-rose-400"
                >
                  Geçersiz CIDR formatı.
                </span>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="add-cidr-label"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              ETİKET (opsiyonel)
            </label>
            <input
              id="add-cidr-label"
              type="text"
              data-testid="add-cidr-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ofis IP'si, VPN, ev ofisi…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-foreground"
            />
          </div>

          {error && (
            <p
              role="alert"
              data-testid="add-cidr-error"
              className="rounded-lg border border-border bg-rose-500/10 px-3 py-2 text-[12px] text-rose-600 dark:text-rose-300"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="mt-6 flex items-center justify-end gap-2">
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
            data-testid="add-cidr-submit"
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Allowlist'e ekle
          </button>
        </footer>
      </section>
    </div>
  )
}

export default AddCidrModal
