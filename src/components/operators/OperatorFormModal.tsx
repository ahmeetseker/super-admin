// Wave F21.A — OperatorFormModal.
//
// Create + edit form for the F21.0 operator-store. The dialog is mounted
// lazily by /operators (open=true) so the bundle pays for it only when a
// super-admin invites or edits someone. Email is the only field with hard
// validation here — the duplicate-guard lives in operator-store.createOperator
// and we surface its thrown message inline.

import { useEffect, useState } from 'react'
import { X } from '@landx/icons'
import { cn } from '@landx/ui'
import { ROLES } from '@landx/data'
import {
  createOperator,
  updateOperator,
  type Operator,
  type OperatorRoleId,
} from '@/lib/operator-store'

interface FormState {
  email: string
  name: string
  roleId: OperatorRoleId
}

function operatorToForm(op: Operator): FormState {
  return { email: op.email, name: op.name, roleId: op.roleId }
}

function emptyForm(): FormState {
  return { email: '', name: '', roleId: 'support' }
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  return local
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ')
}

// RFC 5322-lite — same shape the auth surface uses. We deliberately keep this
// permissive (no IDN/quoted-local pedantry) since the duplicate guard in the
// store does the real work.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  open: boolean
  /** null → create mode; Operator → edit mode */
  initial: Operator | null
  onClose: () => void
  onSaved: (op: Operator) => void
}

export function OperatorFormModal({ open, initial, onClose, onSaved }: Props) {
  const isEdit = !!initial
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [nameTouched, setNameTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(initial ? operatorToForm(initial) : emptyForm())
    setNameTouched(!!initial)
    setError(null)
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEmailChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      email: value,
      // Auto-derive display name from local-part until the user takes over.
      name: nameTouched ? prev.name : nameFromEmail(value),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const email = form.email.trim()
    if (!email) {
      setError('E-posta zorunlu.')
      return
    }
    if (!EMAIL_RE.test(email)) {
      setError('Geçerli bir e-posta gir.')
      return
    }
    const name = form.name.trim() || nameFromEmail(email)

    try {
      const saved =
        isEdit && initial
          ? updateOperator(initial.id, { email, name, roleId: form.roleId })
          : createOperator({ email, name, roleId: form.roleId })
      if (!saved) {
        setError('Operatör kaydedilemedi.')
        return
      }
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata.')
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label={isEdit ? 'Operatörü düzenle' : 'Yeni operatör davet et'}
        data-testid="operator-form-modal"
        className="fixed inset-y-0 right-0 z-50 flex w-[min(480px,calc(100vw-2rem))] flex-col border-l border-border bg-card shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              OPERATÖR · {isEdit ? 'DÜZENLE' : 'YENİ DAVET'}
            </div>
            <h2 className="mt-1 font-serif text-lg font-medium leading-tight">
              {isEdit ? initial!.name : 'Yeni operatör davet et'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Formu kapat"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
          data-testid="operator-form"
        >
          <div className="flex-1 space-y-4 px-5 py-4">
            <div>
              <label
                htmlFor="operator-email"
                className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                E-posta
              </label>
              <input
                id="operator-email"
                data-testid="operator-email-input"
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="ornek@turksab.com"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                disabled={isEdit}
              />
              {isEdit && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  E-posta değişikliği için davet'i iptal edip yeniden gönder.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="operator-name"
                className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                Ad
              </label>
              <input
                id="operator-name"
                data-testid="operator-name-input"
                type="text"
                value={form.name}
                onChange={(e) => {
                  setNameTouched(true)
                  setField('name', e.target.value)
                }}
                placeholder="Ad Soyad"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </div>

            <div>
              <label
                htmlFor="operator-role"
                className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                Rol
              </label>
              <select
                id="operator-role"
                data-testid="operator-role-select"
                value={form.roleId}
                onChange={(e) => setField('roleId', e.target.value as OperatorRoleId)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {ROLES.find((r) => r.id === form.roleId)?.description}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                data-testid="operator-form-error"
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-300"
              >
                {error}
              </div>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              data-testid="operator-form-submit"
              className={cn(
                'inline-flex items-center rounded-xl bg-foreground px-4 py-1.5 text-sm font-medium text-background transition hover:opacity-90',
              )}
            >
              {isEdit ? 'Kaydet' : 'Davet gönder'}
            </button>
          </footer>
        </form>
      </div>
    </>
  )
}

export default OperatorFormModal
