import { ExternalLink, X } from '@landx/icons'
import { stop } from '@/lib/impersonate'
import { useImpersonateStatus } from './useImpersonateStatus'

export function ImpersonateBanner() {
  const info = useImpersonateStatus()
  if (!info) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-[12.5px]"
    >
      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        <span>
          <strong className="font-medium">{info.name}</strong> olarak oturum açıldı.{' '}
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-70">
            tenant={info.tenantId}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={stop}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 px-2.5 py-1 font-medium text-amber-900 transition hover:bg-amber-500/20 dark:text-amber-200"
      >
        <X className="h-3 w-3" aria-hidden />
        Çıkış
      </button>
    </div>
  )
}
