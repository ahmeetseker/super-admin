// Wave F13.E — shared Playwright auth fixture.
//
// Eliminates the per-spec auth-bootstrap copy/paste that grew across Wave F11
// (super-plans, super-plugins, super-webhooks). Each spec was repeating the
// same three pieces of setup:
//
//   1. Seed `superadmin.auth` into sessionStorage so AuthProvider loads
//      authenticated rather than rendering <LoginForm />.
//   2. Stub /api/v1/auth/me so the proactive revalidation in AuthProvider
//      (apps/super-admin/src/auth/AuthProvider.tsx — verifiedRef effect)
//      doesn't 401 and clear the session before the route mounts.
//   3. Stub /api/v1/auth/refresh so the proactive token rotation timer
//      (REFRESH_LEAD_MS) doesn't tear the session down mid-test.
//
// Storage key (`superadmin.auth`) and the {token, expiresAt, user} shape are
// owned by apps/super-admin/src/auth/auth-storage.ts — keep this fixture in
// lockstep with that module if the persistence contract changes.
//
// Usage:
//
//   import { test, expect } from './_fixtures/authenticated'
//
//   test('renders the route', async ({ authedPage: page }) => {
//     await page.goto('/ops/foo')
//     // ...
//   })

import { test as base, expect, type Page } from '@playwright/test'

const FAKE_AUTH = {
  token: 'e2e-fake-token',
  // Refreshed lazily inside the fixture so every test gets a token that is
  // still ~1h away from expiry (avoids flake if REFRESH_LEAD_MS ever changes).
  expiresAt: '',
  user: {
    id: 'u-super-e2e',
    email: 'super@arsam.local',
    name: 'Süper Admin (E2E)',
    role: 'super-admin',
    tenantId: null as string | null,
  },
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    const auth = {
      ...FAKE_AUTH,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: auth.user }),
      })
    })
    await page.route('**/api/v1/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: auth.user,
            token: auth.token,
            expiresAt: auth.expiresAt,
          },
        }),
      })
    })
    await page.addInitScript((seed) => {
      try {
        window.sessionStorage.setItem('superadmin.auth', JSON.stringify(seed))
      } catch {
        /* sessionStorage unavailable (privacy mode) */
      }
    }, auth)
    await use(page)
  },
})

export { expect }
