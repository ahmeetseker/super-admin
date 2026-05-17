/**
 * Super-admin AuthProvider — Wave 15 / Agent-A74 / Faz 12.2.c.
 *
 * Mirrors the admin AuthProvider (A73) but with two key differences for the
 * staff-only super-admin console:
 *
 * 1. **Dev auto-login**: on mount, if there's no token in sessionStorage AND
 *    `import.meta.env.DEV` is true, we POST /auth/login with the seeded
 *    super@arsam.local credentials so devs don't have to type them every
 *    HMR reload. Production builds (`DEV=false`) skip this and show the
 *    inline LoginForm.
 *
 *    Why this is safe: the seed password ('password123') is only configured
 *    for the dev API server (apps/api/src/lib/users.ts STUB_USERS). The
 *    Identity module (I02) will replace this entirely before prod ship.
 *
 * 2. **Hard gate**: ALL super-admin routes require authentication. If the
 *    user isn't authenticated (token missing/expired, auto-login failed in
 *    dev, or production fresh-load), we render <LoginForm /> instead of the
 *    app shell. There is no "anonymous browse" mode like public-site.
 *
 * The provider also configures the shared @landx/data API client on mount via
 * `configureApi({ baseUrl: '/api/v1', getToken })`. The getToken closure reads
 * a ref so the same client picks up token rotations without re-configure.
 *
 * 3. **Proactive refresh** (Faz 10.2.refresh / A77): once authenticated, a
 *    setTimeout is scheduled for `expiresAt - 5min` that POSTs /auth/refresh
 *    and swaps in a fresh token. On failure the unauthorized event fires and
 *    state is cleared (which in dev triggers the auto-login retry).
 *
 * Storage: sessionStorage (tab-scoped). Shared with the impersonate handoff
 * in src/lib/impersonate.ts — see auth-storage.ts.
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  configureApi,
  apiGet,
  apiPost,
  ApiError,
} from '@landx/data'
import { AuthContext, type AuthState, type AuthUser } from './use-auth'
import { clear as clearStorage, load as loadStorage, save as saveStorage } from './auth-storage'

// Lazy: the LoginForm only renders when unauthenticated, and bringing it into
// the main chunk would push us over the 65 KB super-admin budget alongside
// A73's symmetric admin work. Keeping it lazy is the safe choice.
const LoginForm = lazy(() =>
  import('./LoginForm').then((m) => ({ default: m.LoginForm })),
)

interface LoginResponse {
  data: {
    user: AuthUser
    token: string
    expiresAt: string
  }
}

interface MeResponse {
  data: AuthUser
}

const DEV_EMAIL = 'super@arsam.local'
const DEV_PASSWORD = 'password123'

// Mirror apps/api REFRESH_WINDOW_BEFORE_EXP_SEC (5 min). Fire the proactive
// refresh while the token is still inside the API's refresh window.
const REFRESH_LEAD_MS = 5 * 60 * 1000

// Static-host demo mode (GitHub Pages). When VITE_DEMO_AUTH=1:
// - configureApi is skipped so @landx/data hooks fall back to apiOrMock fixtures
// - the user starts authenticated with a frozen demo identity
// - login/logout/refresh become no-ops; no network calls happen
const DEMO_MODE = import.meta.env.VITE_DEMO_AUTH === '1'

const DEMO_USER: AuthUser = {
  id: 'demo-super-admin',
  email: 'demo@super-admin.local',
  name: 'Demo Admin',
  role: 'super_admin',
  tenantId: null,
}
const DEMO_TOKEN = 'demo-token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Seed from sessionStorage so a tab refresh keeps the session.
  const persisted = useMemo(() => (DEMO_MODE ? null : loadStorage()), [])
  const [state, setState] = useState<AuthState>(() =>
    DEMO_MODE
      ? { user: DEMO_USER, token: DEMO_TOKEN, status: 'authenticated', error: null }
      : {
          user: persisted?.user ?? null,
          token: persisted?.token ?? null,
          status: persisted ? 'authenticated' : 'idle',
          error: null,
        },
  )
  // Track expiresAt separately — not exposed on AuthState (which is shared
  // with consumers) so the contract doesn't widen. Used only for scheduling.
  const [expiresAt, setExpiresAt] = useState<string | null>(persisted?.expiresAt ?? null)

  // Token ref → configureApi getToken closure reads the latest value without
  // needing to re-configure on every login/logout.
  const tokenRef = useRef<string | null>(state.token)
  tokenRef.current = state.token

  // Configure the shared API client exactly once on mount. In DEMO_MODE we
  // intentionally skip configureApi so every @landx/data hook falls through to
  // its apiOrMock fixture path — there is no backend on a static host.
  useEffect(() => {
    if (DEMO_MODE) return
    configureApi({
      baseUrl: '/api/v1',
      getToken: () => tokenRef.current,
    })
  }, [])

  const login = useCallback(async (input: { email: string; password: string }) => {
    if (DEMO_MODE) {
      setState({ user: DEMO_USER, token: DEMO_TOKEN, status: 'authenticated', error: null })
      return
    }
    setState((s) => ({ ...s, status: 'loading', error: null }))
    try {
      const res = await apiPost<LoginResponse>('/auth/login', input)
      const { user, token, expiresAt: exp } = res.data
      saveStorage({ user, token, expiresAt: exp })
      setState({ user, token, status: 'authenticated', error: null })
      setExpiresAt(exp)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Giriş başarısız oldu. Lütfen tekrar deneyin.'
      setState({ user: null, token: null, status: 'error', error: message })
      setExpiresAt(null)
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    if (DEMO_MODE) {
      setState({ user: DEMO_USER, token: DEMO_TOKEN, status: 'authenticated', error: null })
      return
    }
    // Fire-and-forget logout — the server side is a no-op stub today.
    try {
      await apiPost('/auth/logout')
    } catch {
      /* swallow — local state is authoritative */
    }
    clearStorage()
    setState({ user: null, token: null, status: 'idle', error: null })
    setExpiresAt(null)
  }, [])

  // Auto-login in dev. Runs exactly once, after the initial mount, and only
  // when there's no persisted token. Production builds skip this entirely.
  const autoLoginAttempted = useRef(false)
  useEffect(() => {
    if (DEMO_MODE) return
    if (autoLoginAttempted.current) return
    if (state.token) return
    if (!import.meta.env.DEV) return
    autoLoginAttempted.current = true
    void login({ email: DEV_EMAIL, password: DEV_PASSWORD })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Revalidate persisted token on mount — if the server says it's expired or
  // belongs to a deleted user, fall back to unauthenticated.
  const verifiedRef = useRef(false)
  useEffect(() => {
    if (DEMO_MODE) return
    if (verifiedRef.current) return
    if (!state.token) return
    verifiedRef.current = true
    apiGet<MeResponse>('/auth/me').catch((err) => {
      if (err instanceof ApiError && err.status === 401) {
        clearStorage()
        setState({ user: null, token: null, status: 'idle', error: null })
        setExpiresAt(null)
      }
      // Other errors (network, 5xx): keep the cached session optimistically.
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Proactive token rotation (Faz 10.2.refresh / A77). Mirror of the admin
  // provider — fires once `REFRESH_LEAD_MS` before `expiresAt`, swaps in a
  // fresh token, then re-runs (deps include expiresAt) which clears the prior
  // timer via the cleanup function. On failure we dispatch the unauthorized
  // event; the dev auto-login `autoLoginAttempted` ref has already flipped,
  // so we don't loop — the user falls back to the login form.
  useEffect(() => {
    if (DEMO_MODE) return
    if (!state.token || !expiresAt) return
    const expiryMs = Date.parse(expiresAt)
    if (!Number.isFinite(expiryMs)) return

    const delay = Math.max(0, expiryMs - Date.now() - REFRESH_LEAD_MS)
    const timer = window.setTimeout(() => {
      apiPost<LoginResponse>('/auth/refresh')
        .then((res) => {
          const { user, token, expiresAt: nextExp } = res.data
          saveStorage({ user, token, expiresAt: nextExp })
          setState({ user, token, status: 'authenticated', error: null })
          setExpiresAt(nextExp)
        })
        .catch(() => {
          clearStorage()
          setState({ user: null, token: null, status: 'idle', error: null })
          setExpiresAt(null)
          window.dispatchEvent(new Event('auth:unauthorized'))
        })
    }, delay)

    return () => window.clearTimeout(timer)
  }, [state.token, expiresAt])

  const value = useMemo(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  )

  // Hard gate — unauthenticated users see only the login form.
  const authenticated = state.status === 'authenticated' && state.token != null

  return (
    <AuthContext.Provider value={value}>
      {authenticated ? (
        children
      ) : (
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      )}
    </AuthContext.Provider>
  )
}
