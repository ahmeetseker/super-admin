// Wave F26.C — super-admin /experiments E2E smoke.
//
// Covers the dashboard scaffolding:
//   1. 4-up KPI strip mounts
//   2. Status filter chips toggle the visible rows
//   3. Row click hydrates the detail panel + distribution chart
//   4. "Yeni deney" modal opens, surfaces a weight validation hint, and
//      lets a happy-path submission grow the table
//
// Auth via the shared authedPage fixture (F13.E).

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

test.beforeEach(async ({ authedPage }) => {
  // Reset the localStorage-backed store so each test starts from the seed.
  await authedPage.addInitScript(() => {
    try {
      window.localStorage.removeItem('arsam.platform-ab-experiments.v1')
    } catch {
      /* localStorage unavailable */
    }
  })
})

test.describe('super-admin /experiments', () => {
  test('renders the dashboard scaffolding', async ({ authedPage: page }) => {
    await page.goto('/experiments')
    await expect(page.getByTestId('experiments-dashboard')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('experiments-kpi-total')).toBeVisible()
    await expect(page.getByTestId('experiments-kpi-running')).toBeVisible()
    await expect(page.getByTestId('experiments-kpi-draft')).toBeVisible()
    await expect(page.getByTestId('experiments-kpi-completed')).toBeVisible()
    await expect(page.getByTestId('experiment-table')).toBeVisible()
  })

  test('status filter chips restrict the table rows', async ({ authedPage: page }) => {
    await page.goto('/experiments')
    await expect(page.getByTestId('experiment-table')).toBeVisible({ timeout: 5000 })

    // "Tümü" baseline → at least one running seed row visible.
    const allRows = page.locator('[data-testid^="experiment-row-"]')
    const totalCount = await allRows.count()
    expect(totalCount).toBeGreaterThan(0)

    await page.getByTestId('experiment-filter-draft').click()
    const draftRows = page.locator('[data-testid^="experiment-row-"][data-status="draft"]')
    await expect(draftRows.first()).toBeVisible()
    const nonDraftRows = page.locator(
      '[data-testid^="experiment-row-"]:not([data-status="draft"])',
    )
    expect(await nonDraftRows.count()).toBe(0)
  })

  test('row click hydrates the detail panel + distribution chart', async ({
    authedPage: page,
  }) => {
    await page.goto('/experiments')
    await expect(page.getByTestId('experiment-table')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('experiment-detail-empty')).toBeVisible()

    // Click the first row regardless of status — running seed is first.
    const firstRow = page.locator('[data-testid^="experiment-row-"]').first()
    await firstRow.click()

    await expect(page.getByTestId('experiment-detail')).toBeVisible()
    await expect(page.getByTestId('distribution-chart')).toBeVisible()
  })

  test('create modal validates weight sum + creates an experiment', async ({
    authedPage: page,
  }) => {
    await page.goto('/experiments')
    await expect(page.getByTestId('experiments-dashboard')).toBeVisible({ timeout: 5000 })

    await page.getByTestId('experiments-create-button').click()
    await expect(page.getByTestId('create-experiment-form')).toBeVisible()

    // Default state is 50/50 → already valid. Bump first weight off to force invalid.
    await page.getByTestId('variant-weight-0').fill('30')
    await expect(page.getByTestId('variant-weight-sum')).toHaveAttribute('data-valid', 'false')

    // Restore + fill the rest, then submit.
    await page.getByTestId('variant-weight-0').fill('50')
    await expect(page.getByTestId('variant-weight-sum')).toHaveAttribute('data-valid', 'true')

    await page.getByTestId('create-experiment-key').fill('e2e-new-experiment')
    await page.getByTestId('create-experiment-name').fill('E2E ile oluşturulan deney')
    await page.getByTestId('create-experiment-submit').click()

    // Modal closes + new row appears in the table.
    await expect(page.getByTestId('create-experiment-form')).not.toBeVisible()
    await expect(page.locator('text=E2E ile oluşturulan deney').first()).toBeVisible()
  })
})
