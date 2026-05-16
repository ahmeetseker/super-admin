/**
 * useAuth() — consumes super-admin AuthContext.
 *
 * Throws if used outside an AuthProvider, mirroring the conventional
 * "must be inside provider" pattern. Components rendered inside
 * <AuthProvider> can call useAuth() to read { user, token, status } and
 * invoke { login, logout }.
 */

import { createContext, useContext } from 'react'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  tenantId: string | null
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error'

export interface AuthState {
  user: AuthUser | null
  token: string | null
  status: AuthStatus
  error: string | null
}

export interface AuthContextValue extends AuthState {
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth() must be used inside <AuthProvider>')
  }
  return ctx
}
