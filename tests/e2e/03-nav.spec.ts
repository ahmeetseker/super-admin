import { test, expect } from '@playwright/test'

test.describe('Super-admin navigation', () => {
  const ROUTES = [
    '/',
    '/tenants',
    '/observability',
    '/llm-cost',
    '/audit',
    '/pii',
    '/plans',
    '/permissions',
    '/plugins',
    '/compliance',
    '/settings',
    '/mcp-tools',
    '/memory-layer',
    '/vector-store',
  ] as const

  for (const path of ROUTES) {
    test(`route ${path}`, async ({ page }) => {
      const r = await page.goto(path)
      expect(r?.status()).toBe(200)
      await expect(page.locator('main')).toBeVisible()
    })
  }
})
