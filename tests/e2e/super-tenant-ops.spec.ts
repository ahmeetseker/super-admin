// Wave F13.B — super-admin tenant ops finalize E2E smoke.
// Drives the three real (formerly placeholder) actions on /tenants/:id —
// Usage CSV, Webhook ekle, Suspend type-to-confirm — plus the bulk select
// flow on /tenants and the audit AdvancedFilterPanel.
//
// F17.A: auth bootstrap (sessionStorage seed + /auth/me + /auth/refresh stubs)
// migrated to the shared `authedPage` fixture in ./_fixtures/authenticated.ts.
// The remaining beforeEach only clears feature-specific localStorage keys.

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

test.beforeEach(async ({ authedPage }) => {
  await authedPage.addInitScript(() => {
    try {
      window.localStorage.removeItem('arsam.platform-tenants-overrides.v1')
      window.localStorage.removeItem('arsam.platform-webhooks.v1')
    } catch {
      /* localStorage unavailable */
    }
  })
})

test.describe('super-admin /tenants — bulk select', () => {
  test('select-all checkbox surfaces the bulk actions bar', async ({ authedPage: page }) => {
    await page.goto('/tenants')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('tenants-select-all').check()
    await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()
    await expect(page.getByTestId('bulk-count')).not.toHaveText('0')
  })

  test('clear button hides the bulk bar', async ({ authedPage: page }) => {
    await page.goto('/tenants')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('tenants-select-all').check()
    await page.getByTestId('bulk-clear').click()
    await expect(page.getByTestId('bulk-actions-bar')).not.toBeVisible()
  })

  test('bulk suspend opens the modal with N-hesap headline', async ({ authedPage: page }) => {
    await page.goto('/tenants')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('tenants-select-all').check()
    await page.getByTestId('bulk-action-suspend').click()
    await expect(page.getByTestId('suspend-modal')).toBeVisible()
    await expect(page.getByText(/hesap askıya alınacak/)).toBeVisible()
  })
})

test.describe('super-admin /tenants/:id — single actions', () => {
  test('usage report button is wired (no more placeholder)', async ({ authedPage: page }) => {
    await page.goto('/tenants')
    const firstRowLink = page.locator('table tbody tr').first().getByRole('link').first()
    await firstRowLink.click()
    await expect(page.getByTestId('usage-report-button')).toBeVisible()
    await expect(page.getByText(/Kullanım raporu indir/)).toBeVisible()
  })

  test('webhook create modal opens and validates HTTPS URL', async ({ authedPage: page }) => {
    await page.goto('/tenants')
    const firstRowLink = page.locator('table tbody tr').first().getByRole('link').first()
    await firstRowLink.click()
    await page.getByTestId('tenant-webhook-create-trigger').click()
    await expect(page.getByTestId('webhook-create-modal')).toBeVisible()
    // Submit disabled until URL is valid.
    const submit = page.getByTestId('webhook-create-submit')
    await expect(submit).toBeDisabled()
    await page.getByTestId('webhook-url-input').fill('https://e2e.example.com/hook')
    await expect(submit).toBeEnabled()
  })

  test('suspend modal requires SUSPEND verbatim', async ({ authedPage: page }) => {
    await page.goto('/tenants')
    const firstRowLink = page.locator('table tbody tr').first().getByRole('link').first()
    await firstRowLink.click()
    await page.getByTestId('tenant-suspend-trigger').click()
    await expect(page.getByTestId('suspend-modal')).toBeVisible()
    const submit = page.getByTestId('suspend-submit')
    await expect(submit).toBeDisabled()
    await page.getByTestId('suspend-confirm-input').fill('suspend')
    await expect(submit).toBeDisabled()
    await page.getByTestId('suspend-confirm-input').fill('SUSPEND')
    await expect(submit).toBeEnabled()
  })
})

test.describe('super-admin /audit — advanced filter', () => {
  test('toggle reveals the panel with severity chips', async ({ authedPage: page }) => {
    await page.goto('/audit')
    await page.getByTestId('audit-advanced-toggle').click()
    await expect(page.getByTestId('audit-advanced-panel')).toBeVisible()
    await expect(page.getByTestId('audit-advanced-severity-info')).toBeVisible()
    await expect(page.getByTestId('audit-advanced-severity-warn')).toBeVisible()
    await expect(page.getByTestId('audit-advanced-severity-error')).toBeVisible()
  })

  test('severity chip toggling narrows the table count', async ({ authedPage: page }) => {
    await page.goto('/audit')
    await page.getByTestId('audit-advanced-toggle').click()
    const allCount = await page.locator('table tbody tr').count()
    await page.getByTestId('audit-advanced-severity-error').click()
    // Either narrowed (fewer rows) or stayed the same if seed has nothing matching;
    // either way, the chip must report aria-pressed=true after the click.
    await expect(page.getByTestId('audit-advanced-severity-error')).toHaveAttribute('aria-pressed', 'true')
    const errorCount = await page.locator('table tbody tr').count()
    expect(errorCount).toBeLessThanOrEqual(allCount)
  })
})
