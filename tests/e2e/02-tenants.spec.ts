import { test, expect } from '@playwright/test'

test.describe('Tenants', () => {
  test('renders tenant list', async ({ page }) => {
    await page.goto('/tenants')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 3000 })
  })

  test('filter by plan', async ({ page }) => {
    await page.goto('/tenants')
    const proButton = page.getByRole('button', { name: /^Pro/i }).first()
    await proButton.click()
    await expect(page.locator('table tbody tr').first()).toBeVisible()
  })
})
