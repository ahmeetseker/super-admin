// Wave F26.B E2E — /i18n string catalog editor.
// Exercises the inline-edit + missing filter + JSON export flows backed by
// the F26.0 i18n-catalog lib (localStorage override store).

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

const CATALOG_KEY = 'arsam.platform-i18n-catalog.v1'

test.beforeEach(async ({ authedPage }) => {
  await authedPage.addInitScript((key) => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* private mode */
    }
  }, CATALOG_KEY)
})

test.describe('super-admin · /i18n', () => {
  test('renders KPI row, filter bar, and catalog table', async ({ authedPage: page }) => {
    await page.goto('/i18n')

    await expect(page.getByTestId('i18n-kpi-row')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('i18n-kpi-total')).toBeVisible()
    await expect(page.getByTestId('i18n-kpi-namespaces')).toBeVisible()
    await expect(page.getByTestId('i18n-kpi-missing-en')).toBeVisible()
    await expect(page.getByTestId('i18n-kpi-missing-tr')).toBeVisible()

    await expect(page.getByTestId('i18n-filter-bar')).toBeVisible()
    await expect(page.getByTestId('i18n-catalog-table')).toBeVisible()
    await expect(page.getByTestId('i18n-row').first()).toBeVisible()
  })

  test('namespace dropdown filters the table', async ({ authedPage: page }) => {
    await page.goto('/i18n')
    const totalRows = await page.getByTestId('i18n-row').count()
    expect(totalRows).toBeGreaterThan(0)

    await page.getByTestId('i18n-namespace-filter').selectOption('auth')
    const authRows = page.getByTestId('i18n-row')
    const authCount = await authRows.count()
    expect(authCount).toBeGreaterThan(0)
    expect(authCount).toBeLessThan(totalRows)

    for (let i = 0; i < authCount; i++) {
      const key = await authRows.nth(i).getAttribute('data-key')
      expect(key).toMatch(/^auth\./)
    }
  })

  test('search input narrows results by key or value', async ({ authedPage: page }) => {
    await page.goto('/i18n')
    await page.getByTestId('i18n-search').fill('signIn')
    await expect(page.getByTestId('i18n-row')).toHaveCount(1)
    await expect(page.getByTestId('i18n-row').first()).toHaveAttribute(
      'data-key',
      'auth.signIn',
    )
  })

  test('inline edit persists override via localStorage and reset reverts', async ({
    authedPage: page,
  }) => {
    await page.goto('/i18n')

    const enCell = page.getByTestId('i18n-cell-en-common.save')
    await expect(enCell).toHaveValue('Save')

    await enCell.fill('Persist')
    await enCell.blur()

    // Re-derive: reset filters + verify override flag on the row.
    await expect(page.getByTestId('i18n-cell-en-common.save')).toHaveValue('Persist')
    const row = page.locator('[data-testid="i18n-row"][data-key="common.save"]')
    await expect(row).toHaveAttribute('data-modified', 'true')

    // Persisted to localStorage under the F26.0 key.
    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      CATALOG_KEY,
    )
    expect(stored).toBeTruthy()
    expect(stored).toContain('Persist')

    // Reset wipes the override and the value returns to seed.
    await page.getByTestId('i18n-reset-common.save').click()
    await expect(page.getByTestId('i18n-cell-en-common.save')).toHaveValue('Save')
    await expect(row).toHaveAttribute('data-modified', 'false')
  })

  test('missing filter chip restricts to rows with empty EN', async ({ authedPage: page }) => {
    await page.goto('/i18n')

    // Force an empty EN cell so the filter has rows to surface.
    const target = page.getByTestId('i18n-cell-en-common.cancel')
    await target.fill('')
    await target.blur()

    await page.getByTestId('i18n-missing-filter-missing-en').click()
    const rows = page.getByTestId('i18n-row')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(1)
    for (let i = 0; i < count; i++) {
      const key = await rows.nth(i).getAttribute('data-key')
      const cell = page.getByTestId(`i18n-cell-en-${key}`)
      await expect(cell).toHaveValue('')
    }
  })

  test('JSON export button triggers a download', async ({ authedPage: page }) => {
    await page.goto('/i18n')
    const button = page.getByTestId('i18n-json-export')
    await expect(button).toBeVisible()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      button.click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^i18n-catalog-.*\.json$/)
  })
})
