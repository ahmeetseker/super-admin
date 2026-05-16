import { useEffect } from 'react'
import { AlertTriangle, X } from '@landx/icons'
import { cn } from '@landx/ui'
import type { PlatformPlan } from '@/lib/platform-plans'
import { deletePlan } from '@/lib/platform-plans'

interface Props {
  plan: PlatformPlan | null
  tenantCount: number
  onClose: () => void
  onDeleted: (id: string) => void
}

export function DeletePlanDialog({ plan, tenantCount, onClose, onDeleted }: Props) {
  useEffect(() => {
    if (!plan) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [plan, onClose])

  if (!plan) return null

  const hasTenants = tenantCount > 0
  const canDelete = !hasTenants

  const handleConfirm = () => {
    if (!canDelete) return
    const ok = deletePlan(plan.id)
    if (ok) onDeleted(plan.id)
    onClose()
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
        aria-label={`Planı sil: ${plan.name}`}
        className="fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              PLAN · SİL
            </div>
            <h2 className="mt-1 font-serif text-lg font-medium leading-tight">{plan.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 px-5 py-4">
          {hasTenants ? (
            <div
              role="alert"
              data-testid="delete-plan-blocked"
              className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-800 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <div>
                <div className="font-medium">
                  Bu planda {tenantCount} ofis var.
                </div>
                <div className="mt-0.5 text-[12px]">
                  Önce ofisleri başka plana taşı, sonra sil.
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              <strong className="text-foreground">{plan.name}</strong> planı kalıcı olarak
              silinecek. Bu işlem geri alınamaz.
            </p>
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
            type="button"
            disabled={!canDelete}
            onClick={handleConfirm}
            className={cn(
              'inline-flex items-center rounded-xl px-4 py-1.5 text-sm font-medium transition',
              canDelete
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'cursor-not-allowed bg-foreground/10 text-muted-foreground',
            )}
          >
            Sil
          </button>
        </footer>
      </div>
    </>
  )
}
