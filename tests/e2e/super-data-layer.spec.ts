// F12.D — /ops/memory-layer + /ops/vector-store. Verifies stats cards render,
// memory list is filterable, drawer opens with full content, vector chart
// renders, and reindex action transitions the collection status.
//
// F17.A: auth bootstrap (sessionStorage seed + /auth/me + /auth/refresh stubs)
// migrated to the shared `authedPage` fixture in ./_fixtures/authenticated.ts.
// The remaining beforeEach only clears the feature-specific localStorage key.

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

const VECTOR_STORAGE_KEY = 'arsam.platform-vector.v1'

test.beforeEach(async ({ authedPage }) => {
  await authedPage.addInitScript((vectorKey) => {
    try {
      window.localStorage.removeItem(vectorKey)
    } catch {
      /* private mode */
    }
  }, VECTOR_STORAGE_KEY)
})

test.describe('super-admin · /ops/memory-layer', () => {
  test('renders 4 KPI stat cards', async ({ authedPage: page }) => {
    await page.goto('/ops/memory-layer')
    await expect(page.getByTestId('memory-stats-cards')).toBeVisible()
    await expect(page.getByTestId('stat-total')).toBeVisible()
    await expect(page.getByTestId('stat-long-term')).toBeVisible()
    await expect(page.getByTestId('stat-avg-access')).toBeVisible()
    await expect(page.getByTestId('stat-hit-rate')).toBeVisible()
  })

  test('entry list is filterable by type', async ({ authedPage: page }) => {
    await page.goto('/ops/memory-layer')
    const list = page.getByTestId('memory-entry-list')
    await expect(list).toBeVisible()

    const initialCount = await list.locator('tbody tr').count()
    expect(initialCount).toBeGreaterThan(0)

    await page.getByTestId('memory-filter-type').selectOption('long-term')

    const filteredCount = await list.locator('tbody tr').count()
    expect(filteredCount).toBeGreaterThan(0)
    // long-term is ~40% of seed → strictly fewer rows than the unfiltered list.
    expect(filteredCount).toBeLessThan(initialCount)
  })

  test('clicking an entry opens the detail drawer with full content', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/memory-layer')
    const list = page.getByTestId('memory-entry-list')
    await expect(list).toBeVisible()

    await list.locator('tbody tr').first().click()
    const drawer = page.getByTestId('memory-entry-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByTestId('memory-entry-drawer-content')).toBeVisible()

    // Drawer closes on overlay click via close button.
    await drawer.getByTestId('memory-entry-drawer-close').click()
    await expect(drawer).toBeHidden()
  })

  test('refresh button is operable', async ({ authedPage: page }) => {
    await page.goto('/ops/memory-layer')
    await expect(page.getByTestId('memory-refresh')).toBeVisible()
    await page.getByTestId('memory-refresh').click()
    // List remains populated after refresh.
    await expect(page.getByTestId('memory-entry-list')).toBeVisible()
  })
})

test.describe('super-admin · /ops/vector-store', () => {
  test('renders 4 KPI stat cards', async ({ authedPage: page }) => {
    await page.goto('/ops/vector-store')
    await expect(page.getByTestId('vector-stats-cards')).toBeVisible()
    await expect(page.getByTestId('vector-stat-vectors')).toBeVisible()
    await expect(page.getByTestId('vector-stat-collections')).toBeVisible()
    await expect(page.getByTestId('vector-stat-index-size')).toBeVisible()
    await expect(page.getByTestId('vector-stat-avg-dim')).toBeVisible()
  })

  test('distribution chart renders 6 bars (one per collection)', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/vector-store')
    const chart = page.getByTestId('vector-distribution-chart')
    await expect(chart).toBeVisible()
    // 6 collections in the seed.
    await expect(chart.locator('[data-testid^="vector-bar-"]')).toHaveCount(6)
  })

  test('collection list shows 6 rows', async ({ authedPage: page }) => {
    await page.goto('/ops/vector-store')
    const list = page.getByTestId('vector-collection-list')
    await expect(list).toBeVisible()
    await expect(list.locator('[data-testid^="vector-row-"]')).toHaveCount(6)
  })

  test('reindex action transitions status to reindexing then back to active', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/vector-store')
    // Pick the `users` collection — smallest, predictable.
    const status = page.getByTestId('vector-status-users')
    await expect(status).toContainText('Aktif')

    await page.getByTestId('reindex-button-users').click()
    const confirm = page.getByTestId('reindex-confirm-dialog-users')
    await expect(confirm).toBeVisible()
    await confirm.getByTestId('reindex-confirm-accept-users').click()

    // Status flips to "Yeniden indeksleniyor" immediately.
    await expect(status).toContainText('Yeniden indeksleniyor', { timeout: 1500 })
    // 2s mock delay → flips back to "Aktif".
    await expect(status).toContainText('Aktif', { timeout: 5000 })
  })
})
