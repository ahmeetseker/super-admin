/**
 * sessionStorage wrapper for super-admin auth state.
 *
 * Tab-scoped (sessionStorage, not localStorage) — staff laptops are shared,
 * and the super-admin console should not persist a token across browser
 * restarts. Sister to apps/super-admin/src/lib/impersonate.ts which uses the
 * same pattern (A53).
 *
 * If sessionStorage is unavailable (SSR, privacy mode), reads return null and
 * writes are silently dropped. The auth flow still works in-memory.
 */

const KEY = 'superadmin.auth'

export interface PersistedAuth {
  token: string
  expiresAt: string
  user: {
    id: string
    email: string
    name: string
    role: string
    tenantId: string | null
  }
}

export function load(): PersistedAuth | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedAuth
    // Expired? Drop silently.
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function save(info: PersistedAuth): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(info))
  } catch {
    /* noop — sessionStorage unavailable */
  }
}

export function clear(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}
