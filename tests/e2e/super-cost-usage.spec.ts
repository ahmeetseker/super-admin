// Wave F12.A — /ops/llm-cost + /ops/sessions smoke E2E.
//
// F17.A: manuel FAKE_AUTH + auth beforeEach silindi → shared `authedPage`
// fixture (./_fixtures/authenticated.ts, F13.E). Bu spec'in auth dışı
// kurulumu yoktu, dolayısıyla beforeEach tamamen kaldırıldı.

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

test.describe('super-admin /ops/llm-cost', () => {
  test('renders 4 KPI cards + bar chart + table', async ({ authedPage: page }) => {
    await page.goto('/ops/llm-cost')
    await expect(page.getByTestId('llm-cost-kpi-cards')).toBeVisible()
    await expect(page.getByTestId('llm-kpi-total-cost')).toBeVisible()
    await expect(page.getByTestId('llm-kpi-total-calls')).toBeVisible()
    await expect(page.getByTestId('llm-kpi-avg-cost')).toBeVisible()
    await expect(page.getByTestId('llm-kpi-top-model')).toBeVisible()
    await expect(page.getByTestId('llm-cost-bar-chart')).toBeVisible()
    await expect(page.getByTestId('llm-cost-table')).toBeVisible()
  })

  test('changing time range to 90d updates filtered count', async ({ authedPage: page }) => {
    await page.goto('/ops/llm-cost')
    const countLabel = page.getByTestId('llm-cost-count')
    await expect(countLabel).toBeVisible()
    const before = (await countLabel.textContent())?.trim() ?? ''
    await page.getByTestId('llm-cost-range-preset').selectOption('90d')
    // Filtered count text refreshes after preset change.
    await expect(countLabel).not.toHaveText(before)
    // Expect 90d to include all 200 seeded entries.
    await expect(countLabel).toContainText('200')
  })

  test('CSV export triggers a download', async ({ authedPage: page }) => {
    await page.goto('/ops/llm-cost')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('llm-cost-export-csv').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^llm-cost-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  test('model filter narrows the table to the selected model', async ({ authedPage: page }) => {
    await page.goto('/ops/llm-cost')
    // Switch to 90d so we have enough data after filtering.
    await page.getByTestId('llm-cost-range-preset').selectOption('90d')
    await page.getByTestId('llm-cost-model').selectOption('claude-sonnet')
    // Only the claude-sonnet row remains in the per-model summary.
    await expect(page.getByTestId('llm-row-claude-sonnet')).toBeVisible()
    await expect(page.getByTestId('llm-row-gpt-4')).toHaveCount(0)
    await expect(page.getByTestId('llm-row-gemini-pro')).toHaveCount(0)
  })
})

test.describe('super-admin /ops/sessions', () => {
  test('renders 4 KPI cards + pie chart + list', async ({ authedPage: page }) => {
    await page.goto('/ops/sessions')
    await expect(page.getByTestId('sessions-kpi-cards')).toBeVisible()
    await expect(page.getByTestId('sessions-kpi-active')).toBeVisible()
    await expect(page.getByTestId('sessions-kpi-total')).toBeVisible()
    await expect(page.getByTestId('sessions-kpi-avg-duration')).toBeVisible()
    await expect(page.getByTestId('sessions-kpi-actions')).toBeVisible()
    await expect(page.getByTestId('sessions-status-pie')).toBeVisible()
    await expect(page.getByTestId('sessions-list')).toBeVisible()
  })

  test('status filter narrows the list', async ({ authedPage: page }) => {
    await page.goto('/ops/sessions')
    await page.getByTestId('sessions-range-preset').selectOption('30d')
    const countLabel = page.getByTestId('sessions-count')
    const before = (await countLabel.textContent())?.trim() ?? ''
    await page.getByTestId('sessions-status').selectOption('revoked')
    await expect(countLabel).not.toHaveText(before)
  })

  test('opening detail drawer reveals action log entries', async ({ authedPage: page }) => {
    await page.goto('/ops/sessions')
    await page.getByTestId('sessions-range-preset').selectOption('30d')
    const firstDetail = page.locator('[data-testid^="sessions-open-"]').first()
    await firstDetail.click()
    const drawer = page.getByTestId('session-drawer')
    await expect(drawer).toBeVisible()
    await expect(page.getByTestId('session-drawer-actions')).toBeVisible()
    // Action log must include at least one entry for the opened session.
    await expect(page.locator('[data-testid^="session-action-"]')).not.toHaveCount(0)
    await page.getByTestId('session-drawer-close').click()
    await expect(drawer).toBeHidden()
  })

  test('CSV export for sessions triggers a download', async ({ authedPage: page }) => {
    await page.goto('/ops/sessions')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('sessions-export-csv').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^sessions-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
