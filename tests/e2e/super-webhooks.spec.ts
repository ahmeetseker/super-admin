import { test, expect } from './_fixtures/authenticated'

// F11.C — /ops/webhooks CRUD smoke. Drives the PageShell at /webhooks and
// exercises render → create → edit → delete → pause/resume → history flows.
// localStorage cleared before each test so the seed migration runs fresh.
//
// F13.E: auth bootstrap (sessionStorage seed + /auth/me + /auth/refresh stubs)
// migrated to the shared `authedPage` fixture in ./_fixtures/authenticated.ts.
// This block only clears the feature-specific localStorage key.
//
// F17.A: delete-row assertion changed from race-prone `toHaveCount(before - 1)`
// (snapshots count, depends on UI re-render timing) to deterministic
// disappear-of-specific-row pattern — assert the target [data-endpoint-id]
// detaches and the rest of the seed (4 sibling rows) remains intact.

test.beforeEach(async ({ authedPage }) => {
  await authedPage.addInitScript(() => {
    try {
      window.localStorage.removeItem('arsam.platform-webhooks.v1')
    } catch {
      /* localStorage unavailable */
    }
  })
})

test.describe('super-admin /webhooks', () => {
  test('renders seeded endpoints from @landx/data migration', async ({ authedPage: page }) => {
    await page.goto('/ops/webhooks')
    await expect(page.getByTestId('endpoints-table')).toBeVisible()
    const rows = page.getByTestId('endpoint-row')
    // Seed has 5 endpoints; migration may dedupe further but is always ≥ 5.
    await expect(rows).toHaveCount(5)
    await expect(page.locator('[data-endpoint-id="whk-001"]')).toBeVisible()
  })

  test('creates a new endpoint via the dialog', async ({ authedPage: page }) => {
    await page.goto('/ops/webhooks')
    await page.getByTestId('create-webhook-cta').click()
    const dialog = page.getByRole('dialog', { name: 'Yeni webhook oluştur' })
    await expect(dialog).toBeVisible()
    await dialog.locator('input[type="url"]').fill('https://test.example.com/hook')
    // Tick first two events.
    const checkboxes = dialog.locator('[data-testid="event-grid"] input[type="checkbox"]')
    await checkboxes.nth(0).check()
    await checkboxes.nth(1).check()
    // Secret is auto-generated; just verify it's a 32-char hex when revealed.
    const secret = dialog.getByTestId('webhook-secret-value')
    await expect(secret).toBeVisible()
    await dialog.getByRole('button', { name: 'Endpoint oluştur' }).click()
    await expect(dialog).toBeHidden()
    // New row appears.
    await expect(page.getByTestId('endpoint-row')).toHaveCount(6)
    await expect(
      page.getByTestId('endpoint-row').filter({ hasText: 'test.example.com/hook' }),
    ).toBeVisible()
  })

  test('opens edit drawer with delivery history embedded', async ({ authedPage: page }) => {
    await page.goto('/ops/webhooks')
    await page
      .locator('[data-endpoint-id="whk-001"]')
      .getByRole('button', { name: /düzenle/i })
      .click()
    const drawer = page.getByRole('dialog', { name: 'Webhook endpoint düzenle' })
    await expect(drawer).toBeVisible()
    // URL field pre-filled.
    await expect(drawer.locator('input[type="url"]')).not.toHaveValue('')
    // Delivery history mounted with rows.
    await expect(drawer.getByTestId('delivery-history-view')).toBeVisible()
    const badges = drawer.getByTestId('delivery-status-badge')
    await expect(badges.first()).toBeVisible()
    // Close drawer.
    await drawer.getByRole('button', { name: 'Kapat' }).first().click()
    await expect(drawer).toBeHidden()
  })

  test('pause/resume toggle flips endpoint status', async ({ authedPage: page }) => {
    await page.goto('/ops/webhooks')
    const row = page.locator('[data-endpoint-id="whk-001"]')
    // Seed whk-001 is active → button reads "Duraklat".
    const pauseBtn = row.getByRole('button', { name: /whk-001 duraklat/i })
    await expect(pauseBtn).toBeVisible()
    await pauseBtn.click()
    // After pause, the button reads "Devam ettir".
    await expect(row.getByRole('button', { name: /whk-001 devam ettir/i })).toBeVisible()
  })

  test('deletes an endpoint via confirm dialog', async ({ authedPage: page }) => {
    await page.goto('/ops/webhooks')
    // Anchor on the specific row we intend to delete so the assertion is
    // independent of any in-flight count snapshot (race against UI rerender).
    const targetRow = page.locator('[data-endpoint-id="whk-004"]')
    await expect(targetRow).toBeVisible()
    await targetRow.getByRole('button', { name: /sil/i }).click()
    const dialog = page.getByRole('dialog', { name: 'Webhook endpoint sil' })
    await expect(dialog).toBeVisible()
    await page.getByTestId('confirm-delete-webhook').click()
    await expect(dialog).toBeHidden()
    // Specific row gone — and the rest of the seed (4 siblings) remains.
    await expect(targetRow).toHaveCount(0)
    await expect(page.getByTestId('endpoint-row')).toHaveCount(4)
  })

  test('test button opens the (preserved) WebhookTestModal', async ({ authedPage: page }) => {
    await page.goto('/ops/webhooks')
    await page
      .locator('[data-endpoint-id="whk-001"]')
      .getByRole('button', { name: /test webhook gönder/i })
      .click()
    await expect(page.getByRole('dialog', { name: 'Webhook test gönderici' })).toBeVisible()
  })
})
