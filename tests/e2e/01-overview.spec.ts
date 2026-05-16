import { test, expect } from '@playwright/test'

test.describe('Super-admin Overview', () => {
  test('loads and shows KPIs', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/MOD · OVERVIEW/i)).toBeVisible({ timeout: 5000 })
    await expect(page.locator('article').first()).toBeVisible()
  })
})
