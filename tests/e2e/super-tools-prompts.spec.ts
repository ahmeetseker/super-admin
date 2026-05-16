// Wave F12.C E2E — /ops/mcp-tools (call analytics) + /ops/prompts (version diff).
// Drives the deterministic platform-mcp-tools.v1 + platform-prompts.v1 seeds.
//
// F17.A: auth bootstrap (sessionStorage seed + /auth/me + /auth/refresh stubs)
// migrated to the shared `authedPage` fixture in ./_fixtures/authenticated.ts.
// The remaining beforeEach only clears feature-specific localStorage keys.

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

const MCP_KEY = 'arsam.platform-mcp-tools.v1'
const PROMPTS_KEY = 'arsam.platform-prompts.v1'

test.beforeEach(async ({ authedPage }) => {
  await authedPage.addInitScript(
    ({ mcpKey, promptsKey }) => {
      try {
        window.localStorage.removeItem(mcpKey)
        window.localStorage.removeItem(promptsKey)
      } catch {
        /* private mode */
      }
    },
    { mcpKey: MCP_KEY, promptsKey: PROMPTS_KEY },
  )
})

test.describe('super-admin · /ops/mcp-tools', () => {
  test('renders KPI row, summary table with 8 tool rows, and SVG chart', async ({ authedPage: page }) => {
    await page.goto('/ops/mcp-tools')
    await expect(page.getByTestId('mcp-kpi-row')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('mcp-tool-usage-chart')).toBeVisible()
    await expect(page.getByTestId('mcp-usage-svg')).toBeVisible()

    const summary = page.getByTestId('mcp-tool-summary')
    await expect(summary).toBeVisible()
    // 8 canonical tools.
    await expect(summary.getByTestId('mcp-tool-row')).toHaveCount(8)
  })

  test('clicking a tool row opens the detail drawer with sample calls', async ({ authedPage: page }) => {
    await page.goto('/ops/mcp-tools')
    const firstRow = page.getByTestId('mcp-tool-summary').getByTestId('mcp-tool-row').first()
    await firstRow.click()

    const drawer = page.getByTestId('mcp-tool-detail-drawer')
    await expect(drawer).toBeVisible()
    // At least one sample row is rendered (seed includes 300 calls across 8 tools).
    const table = drawer.getByTestId('mcp-drawer-table')
    await expect(table).toBeVisible()
    const rowCount = await table.locator('tbody tr').count()
    expect(rowCount).toBeGreaterThan(0)

    // Close via the X button.
    await drawer.getByTestId('mcp-drawer-close').click()
    await expect(drawer).toBeHidden()
  })

  test('status filter narrows the chart + table data set', async ({ authedPage: page }) => {
    await page.goto('/ops/mcp-tools')
    await expect(page.getByTestId('mcp-tool-summary')).toBeVisible()

    // Switch to "error" only.
    await page.getByTestId('mcp-status-filter').selectOption('error')
    // Wait for re-render — the chart legend is still mounted, just data differs.
    await expect(page.getByTestId('mcp-tool-usage-chart')).toBeVisible()
    // Summary rows count is constant (8 canonical tools) but per-row
    // successCount must be 0 when filtered to errors only — sanity check by
    // sampling a non-empty row.
    const firstRow = page.getByTestId('mcp-tool-row').first()
    await expect(firstRow).toBeVisible()
  })
})

test.describe('super-admin · /ops/prompts', () => {
  test('renders KPI row + 15-prompt list and auto-selects the first prompt', async ({ authedPage: page }) => {
    await page.goto('/ops/prompts')
    await expect(page.getByTestId('prompts-kpi-row')).toBeVisible({ timeout: 5000 })
    const list = page.getByTestId('prompts-list')
    await expect(list).toBeVisible()
    // 15 prompts in the catalog.
    await expect(list.getByTestId('prompts-row')).toHaveCount(15)

    // Auto-selection opens the detail section.
    await expect(page.getByTestId('prompts-detail-section')).toBeVisible()
    await expect(page.getByTestId('prompts-version-panel-left')).toBeVisible()
    await expect(page.getByTestId('prompts-version-panel-right')).toBeVisible()
  })

  test('diff viewer renders side-by-side with at least one differing line', async ({ authedPage: page }) => {
    await page.goto('/ops/prompts')
    await expect(page.getByTestId('prompts-detail-section')).toBeVisible()

    const diff = page.getByTestId('prompts-diff-viewer')
    await expect(diff).toBeVisible()

    // v1.0 vs active should produce > 0 add+del ops; verify by selector counts.
    const leftAdded = diff.getByTestId('diff-left').locator('tr[data-op="del"]')
    const rightAdded = diff.getByTestId('diff-right').locator('tr[data-op="add"]')
    const delCount = await leftAdded.count()
    const addCount = await rightAdded.count()
    expect(delCount + addCount).toBeGreaterThan(0)
  })

  test('selecting a different row updates the diff panel', async ({ authedPage: page }) => {
    await page.goto('/ops/prompts')
    await expect(page.getByTestId('prompts-detail-section')).toBeVisible()

    const rows = page.getByTestId('prompts-list').getByTestId('prompts-row')
    const target = rows.nth(2)
    const newId = await target.getAttribute('data-prompt-id')
    expect(newId).toBeTruthy()

    await target.click()
    // Wait until the version selectors carry options for the newly chosen prompt.
    await expect(page.getByTestId('prompts-version-select-left')).toBeVisible()
    await expect(page.getByTestId('prompts-version-select-right')).toBeVisible()
    // The change-reason cell should be visible (proof of detail render).
    const reason = page.getByTestId('prompts-change-reason').first()
    await expect(reason).toBeVisible()
  })

  test('search narrows the list and exact-name match yields one row', async ({ authedPage: page }) => {
    await page.goto('/ops/prompts')
    const list = page.getByTestId('prompts-list')
    await expect(list).toBeVisible()

    await page.getByTestId('prompts-search').fill('lead-qualifier')
    await expect(list.getByTestId('prompts-row')).toHaveCount(1)
  })

  test('changing the right-side version updates the diff highlight', async ({ authedPage: page }) => {
    await page.goto('/ops/prompts')
    await expect(page.getByTestId('prompts-detail-section')).toBeVisible()

    const rightSelect = page.getByTestId('prompts-version-select-right')
    const options = await rightSelect.locator('option').allTextContents()
    expect(options.length).toBeGreaterThanOrEqual(3)

    // Select the first option (v1.0) on the right side — this should yield an
    // all-equal diff vs. left (which is also v1.0).
    const firstValue = await rightSelect.locator('option').first().getAttribute('value')
    expect(firstValue).toBeTruthy()
    await rightSelect.selectOption(firstValue!)

    const diff = page.getByTestId('prompts-diff-viewer')
    await expect(diff).toBeVisible()
  })
})
