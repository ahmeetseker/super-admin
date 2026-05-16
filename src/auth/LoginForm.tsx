/**
 * Minimal token-only login form for super-admin staff.
 *
 * Renders when AuthProvider is in `idle` / `error` / `loading` state.
 * Submits to /auth/login via the provider's `login` action. Once
 * authenticated, AuthProvider unmounts this and renders the real app shell.
 *
 * Lazy-loaded from AuthProvider — keeps the 65 KB super-admin main budget
 * intact for the authenticated hot path.
 */

import { useState } from 'react'
import { useAuth } from './use-auth'

export function LoginForm() {
  const { login, status, error } = useAuth()
  const [email, setEmail] = useState('super@arsam.local')
  const [password, setPassword] = useState('')

  const submitting = status === 'loading'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email || !password) return
    try {
      await login({ email: email.trim(), password })
    } catch {
      /* error surfaced via context */
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            LANDX · OPS
          </div>
          <h1 className="mt-1 font-serif text-2xl font-light tracking-tight">
            Süper-admin <em className="italic">giriş</em>
          </h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Yalnızca platform ekibi içindir.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              E-posta
            </span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="login-email-input"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
            />
          </label>
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Parola
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="login-password-input"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
            />
          </label>

          {error && (
            <div
              role="alert"
              data-testid="form-error"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            data-testid="login-submit"
            className="w-full rounded-xl bg-foreground px-3 py-2.5 text-sm font-medium text-background transition disabled:opacity-60"
          >
            {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>

          <p className="pt-1 text-center font-mono text-[10px] text-muted-foreground">
            Dev: super@arsam.local · password123
          </p>
        </form>
      </div>
    </div>
  )
}
