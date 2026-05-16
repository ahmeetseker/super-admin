import { test, expect } from './_fixtures/authenticated'

// F11.A — /ops/plans CRUD smoke. Drives the PageShell at /plans and exercises
// create → edit → delete-blocked → empty-search flows. Storage cleared before
// each case so seed defaults (Ücretsiz/Pro/Premium/Kurumsal) are deterministic.
//
// F13.E: auth bootstrap (sessionStorage seed + /auth/me + /auth/refresh stubs)
// migrated to the shared `authedPage` fixture in ./_fixtures/authenticated.ts.
// This block only clears the feature-specific localStorage key.
//
// F17.A: delete-row assertion changed from race-prone `toHaveCount(before - 1)`
// to a deterministic shape — assert the deleted heading disappears and the
// remaining seed (3 cards) is intact.

test.beforeEach(async ({ authedPage }) => {
  await authedPage.addInitScript(() => {
    try {
      window.localStorage.removeItem('arsam.platform-plans.v1')
    } catch {
      /* localStorage unavailable */
    }
  })
})

test.describe('super-admin /plans', () => {
  test('renders the 4 default seed plans', async ({ authedPage: page }) => {
    await page.goto('/ops/plans')
    const grid = page.getByTestId('plans-grid')
    await expect(grid).toBeVisible()
    const cards = page.locator('[data-testid^="plan-card-"]')
    await expect(cards).toHaveCount(4)
    await expect(page.getByRole('heading', { name: 'Ücretsiz' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Premium' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Kurumsal' })).toBeVisible()
  })

  test('creates a new plan via the form drawer', async ({ authedPage: page }) => {
    await page.goto('/ops/plans')
    await page.getByTestId('create-plan-cta').click()
    const dialog = page.getByRole('dialog', { name: 'Yeni plan oluştur' })
    await expect(dialog).toBeVisible()
    await dialog.locator('input[type="text"]').first().fill('Starter Plus')
    await dialog.locator('select').first().selectOption('pro')
    // priceMonthly is the only number input outside the limits fieldset.
    await dialog.locator('input[type="number"]').first().fill('149')
    await dialog.getByRole('button', { name: 'Plan oluştur' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Starter Plus' })).toBeVisible()
    await expect(page.locator('[data-testid^="plan-card-"]')).toHaveCount(5)
  })

  test('opens the edit drawer with existing values pre-filled', async ({ authedPage: page }) => {
    await page.goto('/ops/plans')
    await page.getByRole('button', { name: 'Pro planını düzenle' }).click()
    const dialog = page.getByRole('dialog', { name: 'Planı düzenle' })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('input[type="text"]').first()).toHaveValue('Pro')
    // Cancel to exit.
    await dialog.getByRole('button', { name: 'Vazgeç' }).click()
    await expect(dialog).toBeHidden()
  })

  test('blocks deletion when the plan has attached tenants', async ({ authedPage: page }) => {
    await page.goto('/ops/plans')
    // Pro has Tenants in mock TENANTS — delete should be blocked.
    await page.getByRole('button', { name: 'Pro planını sil' }).click()
    const dialog = page.getByRole('dialog', { name: /Planı sil/i })
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId('delete-plan-blocked')).toBeVisible()
    await expect(page.getByTestId('delete-plan-blocked')).toContainText(
      /Bu planda \d+ ofis var/,
    )
    const confirmBtn = dialog.getByRole('button', { name: 'Sil' })
    await expect(confirmBtn).toBeDisabled()
  })

  test('allows deletion when no tenants are attached', async ({ authedPage: page }) => {
    await page.goto('/ops/plans')
    // Kurumsal (custom) has no tenants in the seed → delete should work.
    // Anchor on the specific heading so the assertion is independent of any
    // in-flight count snapshot (race against UI rerender).
    const kurumsalHeading = page.getByRole('heading', { name: 'Kurumsal' })
    await expect(kurumsalHeading).toBeVisible()
    await page.getByRole('button', { name: 'Kurumsal planını sil' }).click()
    const dialog = page.getByRole('dialog', { name: /Planı sil/i })
    await expect(dialog).toBeVisible()
    const confirmBtn = dialog.getByRole('button', { name: 'Sil' })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()
    await expect(dialog).toBeHidden()
    // Deleted card's heading is gone, remaining seed (3 cards) intact.
    await expect(kurumsalHeading).toHaveCount(0)
    await expect(page.locator('[data-testid^="plan-card-"]')).toHaveCount(3)
  })

  test('search filters cards by name', async ({ authedPage: page }) => {
    await page.goto('/ops/plans')
    await page.getByLabel('Planlarda ara').fill('premium')
    await expect(page.locator('[data-testid^="plan-card-"]')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: 'Premium' })).toBeVisible()
    await page.getByLabel('Planlarda ara').fill('zzzz')
    await expect(page.getByTestId('plans-empty')).toBeVisible()
  })
})
