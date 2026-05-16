import { useImpersonateStatus } from '../impersonate/useImpersonateStatus'

/**
 * Header extras-row chip — surfaces only when impersonating, showing the
 * active tenant name. Case B applies: `ImpersonateBanner` previously had
 * its state-read inline, so a shared `useImpersonateStatus` hook was
 * extracted and is consumed by both the banner and this chip.
 */
export function ImpersonateChip() {
  const info = useImpersonateStatus()
  if (!info) return null
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400"
    >
      Impersonating · {info.name}
    </span>
  )
}
