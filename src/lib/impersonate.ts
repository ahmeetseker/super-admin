// Super-admin impersonate handoff (mock).
// sessionStorage keyed so it's tab-scoped and clears on close.

const KEY = 'superadmin.impersonating'

export interface ImpersonateInfo {
  tenantId: string
  name: string
  ts: number
}

export function start(tenant: { id: string; name: string }, opts?: { openPanel?: boolean }) {
  const info: ImpersonateInfo = { tenantId: tenant.id, name: tenant.name, ts: Date.now() }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(info))
  } catch {
    // sessionStorage may be unavailable (SSR / privacy); silently ignore.
  }
  if (opts?.openPanel !== false && typeof window !== 'undefined') {
    window.open(`/panel/?as=${encodeURIComponent(tenant.id)}`, '_blank', 'noopener')
  }
  // Dispatch a synthetic storage event so listeners in the same tab update.
  window.dispatchEvent(new Event('impersonate:change'))
  return info
}

export function stop() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('impersonate:change'))
  }
}

export function getInfo(): ImpersonateInfo | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as ImpersonateInfo
  } catch {
    return null
  }
}

export function isActive(): boolean {
  return getInfo() !== null
}
