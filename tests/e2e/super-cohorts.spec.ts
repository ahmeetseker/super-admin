// Wave F20.C — super-admin /cohorts E2E smoke.
//
// Covers the three F20.C dashboard sections:
//   1. RetentionSummary KPI strip
//   2. CohortMatrix heatmap render
//   3. ChurnRiskList row visibility + impersonate handoff (banner appears)
//
// Auth is supplied by the shared authedPage fixture (F13.E).

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

test.beforeEach(async ({ authedPage }) => {
  // Ensure no stale impersonation lingers between tests.
  await authedPage.addInitScript(() => {
    try {
      window.sessionStorage.removeItem('superadmin.impersonating')
    } catch {
      /* sessionStorage unavailable */
    }
  })
})

test.describe('super-admin /cohorts', () => {
  test('renders the dashboard with all three sections', async ({ authedPage: page }) => {
    await page.goto('/cohorts')
    await expect(page.getByTestId('cohorts-dashboard')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('retention-summary')).toBeVisible()
    await expect(page.getByTestId('cohort-matrix')).toBeVisible()
  })

  test('retention summary surfaces all four KPI tiles', async ({ authedPage: page }) => {
    await page.goto('/cohorts')
    await expect(page.getByTestId('retention-kpi-30d')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('retention-kpi-60d')).toBeVisible()
    await expect(page.getByTestId('retention-kpi-90d')).toBeVisible()
    await expect(page.getByTestId('retention-kpi-risk')).toBeVisible()
  })

  test('cohort matrix renders at least one tinted cell', async ({ authedPage: page }) => {
    await page.goto('/cohorts')
    const matrix = page.getByTestId('cohort-matrix')
    await expect(matrix).toBeVisible({ timeout: 5000 })
    // Any cell with a data-testid prefix cohort-cell-* should exist.
    const cells = matrix.locator('[data-testid^="cohort-cell-"]')
    const count = await cells.count()
    expect(count).toBeGreaterThan(0)
  })

  test('churn risk list surfaces an at-risk or critical tenant from the seed', async ({
    authedPage: page,
  }) => {
    await page.goto('/cohorts')
    // The seed has Askıda + Churned tenants, so the list should render.
    await expect(page.getByTestId('churn-risk-list')).toBeVisible({ timeout: 5000 })
    // At least one row should appear with either tier tag.
    const rows = page.locator('[data-testid^="churn-risk-row-"]')
    expect(await rows.count()).toBeGreaterThan(0)
  })

  test('impersonate button activates the banner', async ({ authedPage: page }) => {
    await page.goto('/cohorts')
    await expect(page.getByTestId('churn-risk-list')).toBeVisible({ timeout: 5000 })
    // Prevent the new-tab popup that `start()` triggers from blocking the test.
    const firstImpersonate = page.locator('[data-testid^="churn-risk-impersonate-"]').first()
    await expect(firstImpersonate).toBeVisible()
    // window.open is a no-op-friendly stub in the test runtime; the banner is
    // driven by sessionStorage + the synthetic 'impersonate:change' event.
    await page.evaluate(() => {
      // Capture window.open so the test doesn't actually navigate.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).open = () => null
    })
    await firstImpersonate.click()
    // ImpersonateBanner has role="status" and starts with "...olarak oturum açıldı."
    await expect(page.getByRole('status').filter({ hasText: /olarak oturum açıldı/ })).toBeVisible({
      timeout: 3000,
    })
  })
})
