// Wave F20.B — /revenue dashboard smoke E2E.
//
// Asserts the four sections wired in F20.B (KPI row, trend chart with
// SVG present, churn waterfall with SVG present, LTV plan grid with at
// least 3 cards) plus CSV download trigger.
//
// Uses the shared authedPage fixture (F13.E).

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

test.describe('super-admin /revenue', () => {
  test('renders KPI row, trend chart, waterfall, LTV grid', async ({
    authedPage: page,
  }) => {
    await page.goto('/revenue')

    // KPI row
    await expect(page.getByTestId('revenue-kpis')).toBeVisible()
    await expect(page.getByTestId('revenue-kpi-mrr')).toBeVisible()
    await expect(page.getByTestId('revenue-kpi-arr')).toBeVisible()
    await expect(page.getByTestId('revenue-kpi-active')).toBeVisible()
    await expect(page.getByTestId('revenue-kpi-churn')).toBeVisible()

    // Trend chart SVG
    await expect(page.getByTestId('revenue-trend-chart')).toBeVisible()
    await expect(page.getByTestId('revenue-trend-svg')).toBeVisible()

    // Waterfall SVG
    await expect(page.getByTestId('revenue-waterfall')).toBeVisible()
    await expect(page.getByTestId('revenue-waterfall-svg')).toBeVisible()

    // LTV grid — at least 3 plan cards
    await expect(page.getByTestId('revenue-ltv-grid')).toBeVisible()
    const ltvCards = page.locator('[data-testid^="revenue-ltv-"]:not([data-testid="revenue-ltv-grid"]):not([data-testid="revenue-ltv-empty"]):not([data-testid^="revenue-ltv-value-"])')
    expect(await ltvCards.count()).toBeGreaterThanOrEqual(3)
  })

  test('CSV export triggers a download', async ({ authedPage: page }) => {
    await page.goto('/revenue')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('revenue-export-csv').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^gelir_\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
