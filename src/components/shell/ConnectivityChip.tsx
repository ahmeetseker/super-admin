import { useOnline } from '@landx/ui/lib'

/**
 * Header extras-row chip — surfaces only while offline so ops chrome
 * stays clean. Replaces the floating ConnectivityBanner banner that
 * lived above the sidebar in the legacy layout.
 */
export function ConnectivityChip() {
  const online = useOnline()
  if (online) return null
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Çevrimdışı · salt-okunur
    </span>
  )
}
