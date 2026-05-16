// Wave F20.A — super-admin /tenants/:id deep-dive E2E smoke.
//
// Navigates the four-tab bar (Genel · Kullanım · Gelir · Sağlık) on the
// detail route and asserts each tab unlocks its dedicated panel + that the
// URL ?tab= param tracks the active tab. Falls back to direct deep-links so
// the suite remains useful even if the tenant list flake-paginates.

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

const FIRST_TENANT_ID = 'atolye-ayv' // seeded in @landx/data — see mock/platform/tenants.ts

test.describe('super-admin /tenants/:id — F20.A deep-dive tabs', () => {
  test('Genel tab renders by default (no ?tab= param)', async ({ authedPage: page }) => {
    await page.goto(`/tenants/${FIRST_TENANT_ID}`)
    await expect(page.getByTestId('tenant-tab-bar')).toBeVisible()
    const overview = page.getByTestId('tenant-tab-overview')
    await expect(overview).toHaveAttribute('aria-selected', 'true')
    // Genel content sanity: F11/F13 KPI row + audit section survive.
    await expect(page.getByText(/Aylık ciro \(MRR\)/)).toBeVisible()
  })

  test('Kullanım tab unlocks quota bars + CSV trigger', async ({ authedPage: page }) => {
    await page.goto(`/tenants/${FIRST_TENANT_ID}`)
    await page.getByTestId('tenant-tab-usage').click()
    await expect(page).toHaveURL(/[?&]tab=usage/)
    await expect(page.getByTestId('tenant-usage-panel')).toBeVisible()
    await expect(page.getByTestId('usage-bar-listings')).toBeVisible()
    await expect(page.getByTestId('usage-bar-users')).toBeVisible()
    await expect(page.getByTestId('usage-bar-storage')).toBeVisible()
    await expect(page.getByTestId('usage-report-button')).toBeVisible()
  })

  test('Gelir tab renders sparkline + plan badge', async ({ authedPage: page }) => {
    await page.goto(`/tenants/${FIRST_TENANT_ID}?tab=revenue`)
    await expect(page.getByTestId('tenant-revenue-panel')).toBeVisible()
    await expect(page.getByTestId('revenue-sparkline')).toBeVisible()
    await expect(page.getByTestId('revenue-plan-badge')).toBeVisible()
    await expect(page.getByTestId('tenant-tab-revenue')).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('Sağlık tab renders gauge + tier badge + signals', async ({ authedPage: page }) => {
    await page.goto(`/tenants/${FIRST_TENANT_ID}?tab=health`)
    await expect(page.getByTestId('tenant-health-panel')).toBeVisible()
    await expect(page.getByTestId('health-gauge')).toBeVisible()
    await expect(page.getByTestId('health-tier-badge')).toBeVisible()
    await expect(page.getByTestId('health-signal-row').first()).toBeVisible()
  })

  test('tab switch updates URL + clears ?tab= when returning to Genel', async ({
    authedPage: page,
  }) => {
    await page.goto(`/tenants/${FIRST_TENANT_ID}?tab=health`)
    await expect(page.getByTestId('tenant-health-panel')).toBeVisible()
    await page.getByTestId('tenant-tab-overview').click()
    await expect(page).not.toHaveURL(/[?&]tab=/)
    await expect(page.getByText(/Aylık ciro \(MRR\)/)).toBeVisible()
  })

  test('invalid ?tab= value falls back to Genel', async ({ authedPage: page }) => {
    await page.goto(`/tenants/${FIRST_TENANT_ID}?tab=garbage`)
    await expect(page.getByTestId('tenant-tab-overview')).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
