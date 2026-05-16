// Wave F26.A — /feature-flags E2E smoke.
// Renders KPI strip, drives the search + tag filter, creates a flag via
// the modal, and toggles the enabled switch. localStorage cleared per spec
// so seeded data is the deterministic baseline.

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

test.beforeEach(async ({ authedPage }) => {
  await authedPage.addInitScript(() => {
    try {
      window.localStorage.removeItem('arsam.platform-feature-flags.v1')
    } catch {
      /* localStorage unavailable */
    }
  })
})

test.describe('super-admin /feature-flags', () => {
  test('renders KPI strip + 8 seeded rows', async ({ authedPage: page }) => {
    await page.goto('/feature-flags')
    await expect(page.getByTestId('feature-flags-kpi')).toBeVisible()
    await expect(page.getByTestId('feature-flags-table')).toBeVisible()
    await expect(page.getByTestId('feature-flag-row')).toHaveCount(8)
  })

  test('search input narrows visible rows', async ({ authedPage: page }) => {
    await page.goto('/feature-flags')
    await page.getByTestId('feature-flags-search').fill('dark')
    await expect(page.getByTestId('feature-flag-row')).toHaveCount(1)
    await expect(page.locator('[data-flag-key="dark-mode"]')).toBeVisible()
  })

  test('create modal persists a brand-new feature flag', async ({ authedPage: page }) => {
    await page.goto('/feature-flags')
    await page.getByTestId('create-flag-cta').click()
    const modal = page.getByTestId('create-flag-modal')
    await expect(modal).toBeVisible()
    await modal.getByTestId('flag-key-input').fill('e2e-new-flag')
    await modal.getByTestId('flag-name-input').fill('E2E yeni bayrak')
    await modal.getByTestId('flag-tags-input').fill('e2e, smoke')
    await modal.getByTestId('create-flag-submit').click()
    await expect(modal).toBeHidden()
    await expect(page.getByTestId('feature-flag-row')).toHaveCount(9)
    await expect(page.locator('[data-flag-key="e2e-new-flag"]')).toBeVisible()
  })

  test('enabled toggle flips aria-checked and persists across reload', async ({
    authedPage: page,
  }) => {
    await page.goto('/feature-flags')
    const realtime = page.locator('[data-flag-key="realtime-messaging"]')
    const toggle = realtime.getByRole('switch')
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    // Reload to confirm persistence through localStorage.
    await page.reload()
    const toggleAfter = page
      .locator('[data-flag-key="realtime-messaging"]')
      .getByRole('switch')
    await expect(toggleAfter).toHaveAttribute('aria-checked', 'true')
  })
})
