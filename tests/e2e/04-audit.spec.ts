import { test, expect } from '@playwright/test'

test('Audit log shows entries', async ({ page }) => {
  await page.goto('/audit')
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })
  const detailBtn = page.locator('button:has-text("Detay")').first()
  if (await detailBtn.count() > 0) {
    await detailBtn.click()
  }
})
