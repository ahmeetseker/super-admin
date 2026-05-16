import { test, expect } from './_fixtures/authenticated'

const STORAGE_KEY = 'arsam.platform-plugins.v1'

// F13.E: auth bootstrap (sessionStorage seed + /auth/me + /auth/refresh stubs)
// migrated to the shared `authedPage` fixture in ./_fixtures/authenticated.ts.
// This block only clears the feature-specific localStorage key.

test.describe('super-admin · plugins', () => {
  test.beforeEach(async ({ authedPage }) => {
    await authedPage.addInitScript((key) => {
      try {
        window.localStorage.removeItem(key)
      } catch {
        /* private mode */
      }
    }, STORAGE_KEY)
  })

  test('renders 12 seeded plugins with filter chips', async ({ authedPage: page }) => {
    await page.goto('/ops/plugins')
    const grid = page.getByTestId('plugin-grid')
    await expect(grid).toBeVisible({ timeout: 3000 })
    // 12 installed cards expected from the seed.
    await expect(grid.locator('[data-testid^="plugin-card-"]')).toHaveCount(12)
    // Filter chips are present.
    await expect(page.getByTestId('filter-all')).toBeVisible()
    await expect(page.getByTestId('filter-active')).toBeVisible()
    await expect(page.getByTestId('filter-disabled')).toBeVisible()
    await expect(page.getByTestId('filter-error')).toBeVisible()
  })

  test('error filter shows only the error plugin (1)', async ({ authedPage: page }) => {
    await page.goto('/ops/plugins')
    await page.getByTestId('filter-error').click()
    const grid = page.getByTestId('plugin-grid')
    await expect(grid.locator('[data-testid^="plugin-card-"]')).toHaveCount(1)
  })

  test('marketplace opens with 20 cards and category filter narrows results', async ({ authedPage: page }) => {
    await page.goto('/ops/plugins')
    await page.getByTestId('open-marketplace').click()
    const dialog = page.getByTestId('plugin-marketplace-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('[data-testid^="marketplace-card-"]')).toHaveCount(20)

    // Narrow to one category — count must drop strictly below 20.
    await dialog.getByTestId('marketplace-cat-security').click()
    const securityCount = await dialog.locator('[data-testid^="marketplace-card-"]').count()
    expect(securityCount).toBeGreaterThan(0)
    expect(securityCount).toBeLessThan(20)
  })

  test('install confirm shows permissions and transitions through installing → active', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/plugins')
    await page.getByTestId('open-marketplace').click()

    // Pick the first marketplace card.
    const firstCard = page.getByTestId('plugin-marketplace-dialog').locator('[data-testid^="marketplace-card-"]').first()
    const targetId = await firstCard.getAttribute('data-testid')
    const pluginId = targetId!.replace('marketplace-card-', '')

    await page.getByTestId(`install-${pluginId}`).click()

    // Confirm dialog with permissions list visible.
    const confirm = page.getByTestId('install-confirm-dialog')
    await expect(confirm).toBeVisible()
    await expect(confirm.getByTestId('install-permissions-list')).toBeVisible()

    await confirm.getByTestId('install-confirm-accept').click()

    // After install the plugin should appear in the installed grid (13 total).
    await expect(page.getByTestId('plugin-grid').locator('[data-testid^="plugin-card-"]')).toHaveCount(13, { timeout: 4000 })
  })

  test('detail drawer exposes 4 tabs and changelog entries', async ({ authedPage: page }) => {
    await page.goto('/ops/plugins')
    const firstCard = page.getByTestId('plugin-grid').locator('[data-testid^="plugin-card-"]').first()
    // The card is itself role=button — click it to open the drawer.
    await firstCard.click()

    const drawer = page.getByTestId('plugin-detail-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByTestId('plugin-tab-general')).toBeVisible()
    await expect(drawer.getByTestId('plugin-tab-permissions')).toBeVisible()
    await expect(drawer.getByTestId('plugin-tab-config')).toBeVisible()
    await expect(drawer.getByTestId('plugin-tab-changelog')).toBeVisible()

    await drawer.getByTestId('plugin-tab-changelog').click()
    const changelog = drawer.getByTestId('plugin-changelog')
    await expect(changelog).toBeVisible()
    // 5 entries per plugin (seed) — direct <li> children of the ordered list.
    await expect(changelog.locator('> li')).toHaveCount(5)
  })

  test('uninstall removes plugin from grid', async ({ authedPage: page }) => {
    await page.goto('/ops/plugins')
    const grid = page.getByTestId('plugin-grid')
    const before = await grid.locator('[data-testid^="plugin-card-"]').count()
    expect(before).toBe(12)

    const firstCard = grid.locator('[data-testid^="plugin-card-"]').first()
    const cardId = (await firstCard.getAttribute('data-testid'))!.replace('plugin-card-', '')

    // Open menu and click "Kaldır".
    await firstCard.getByRole('button', { name: /menü/ }).click()
    await firstCard.getByRole('menuitem', { name: /Kaldır/ }).click()

    const dlg = page.getByTestId('uninstall-plugin-dialog')
    await expect(dlg).toBeVisible()
    await dlg.getByTestId('uninstall-confirm').click()

    await expect(grid.locator(`[data-testid="plugin-card-${cardId}"]`)).toHaveCount(0)
    await expect(grid.locator('[data-testid^="plugin-card-"]')).toHaveCount(11)
  })
})
