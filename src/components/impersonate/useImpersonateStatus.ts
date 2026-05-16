import { useEffect, useState, useSyncExternalStore } from 'react'
import { getInfo, type ImpersonateInfo } from '@/lib/impersonate'

/**
 * Subscribes to impersonate session changes (custom `impersonate:change`
 * event + cross-tab `storage` event) and returns the active session info,
 * or `null` when not impersonating / before hydration.
 *
 * Extracted from `ImpersonateBanner` so the same state can drive both the
 * legacy full-width banner and the new header extras-row chip without
 * duplicating the sessionStorage read.
 */

function subscribe(cb: () => void) {
  window.addEventListener('impersonate:change', cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener('impersonate:change', cb)
    window.removeEventListener('storage', cb)
  }
}

function getSnapshot(): ImpersonateInfo | null {
  return getInfo()
}

function getServerSnapshot(): ImpersonateInfo | null {
  return null
}

export function useImpersonateStatus(): ImpersonateInfo | null {
  const info = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return info
}
