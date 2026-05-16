// Wave F12.B — /ops/web-vitals dashboard smoke. Drives the PageShell at
// /web-vitals and exercises render → metric cards → chart → device filter
// → alerts → CSV export flows. localStorage cleared before each test so the
// 500-entry deterministic seed re-materialises fresh.
//
// F17.A: auth bootstrap (sessionStorage seed + /auth/me + /auth/refresh stubs)
// migrated to the shared `authedPage` fixture in ./_fixtures/authenticated.ts.
// The remaining beforeEach only clears the feature-specific localStorage key.

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

const STORAGE_KEY = 'arsam.platform-web-vitals.v1'

test.describe('super-admin · web-vitals', () => {
  test.beforeEach(async ({ authedPage }) => {
    await authedPage.addInitScript((key) => {
      try {
        window.localStorage.removeItem(key)
      } catch {
        /* private mode */
      }
    }, STORAGE_KEY)
  })

  test('renders 5 Core Web Vitals metric cards (INP/CLS/LCP/FCP/TTFB)', async ({ authedPage: page }) => {
    await page.goto('/ops/web-vitals')
    const grid = page.getByTestId('metric-cards')
    await expect(grid).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('metric-card-INP')).toBeVisible()
    await expect(page.getByTestId('metric-card-CLS')).toBeVisible()
    await expect(page.getByTestId('metric-card-LCP')).toBeVisible()
    await expect(page.getByTestId('metric-card-FCP')).toBeVisible()
    await expect(page.getByTestId('metric-card-TTFB')).toBeVisible()
    // Each card carries a status chip.
    for (const m of ['INP', 'CLS', 'LCP', 'FCP', 'TTFB']) {
      await expect(page.getByTestId(`metric-status-${m}`)).toBeVisible()
    }
  })

  test('renders one VitalsChart per metric with p50/p75/p95 lines', async ({ authedPage: page }) => {
    await page.goto('/ops/web-vitals')
    const charts = page.getByTestId('vitals-charts')
    await expect(charts).toBeVisible({ timeout: 5000 })
    // Default metric=all → 5 charts (one per metric).
    await expect(charts.locator('> [data-testid^="vitals-chart-"]')).toHaveCount(5)
    // LCP chart must include p50/p75/p95 path elements.
    await expect(page.getByTestId('vitals-line-LCP-p50')).toBeVisible()
    await expect(page.getByTestId('vitals-line-LCP-p75')).toBeVisible()
    await expect(page.getByTestId('vitals-line-LCP-p95')).toBeVisible()
  })

  test('device filter narrows the chart sample count', async ({ authedPage: page }) => {
    await page.goto('/ops/web-vitals')
    await expect(page.getByTestId('metric-cards')).toBeVisible({ timeout: 5000 })
    // Switch to a wider window so we have enough samples to compare.
    await page
      .getByTestId('vitals-time-range-preset')
      .selectOption('30d')
    // Capture the description sample total before filtering.
    const before = await page.locator('main').textContent()
    const beforeMatch = before?.match(/(\d+)\s*\/\s*(\d+)\s*örnek/)
    expect(beforeMatch).not.toBeNull()
    const beforeScoped = Number(beforeMatch![1])

    // Pick mobile and verify the scoped count drops.
    await page.getByTestId('vitals-device-select').selectOption('mobile')
    const after = await page.locator('main').textContent()
    const afterMatch = after?.match(/(\d+)\s*\/\s*(\d+)\s*örnek/)
    expect(afterMatch).not.toBeNull()
    const afterScoped = Number(afterMatch![1])
    expect(afterScoped).toBeLessThan(beforeScoped)
  })

  test('metric filter collapses the chart grid to a single chart', async ({ authedPage: page }) => {
    await page.goto('/ops/web-vitals')
    const charts = page.getByTestId('vitals-charts')
    await expect(charts).toBeVisible({ timeout: 5000 })
    await page.getByTestId('vitals-metric-select').selectOption('LCP')
    await expect(charts.locator('> [data-testid^="vitals-chart-"]')).toHaveCount(1)
    await expect(page.getByTestId('vitals-chart-LCP')).toBeVisible()
  })

  test('alert panel surfaces threshold violations with a non-zero count', async ({ authedPage: page }) => {
    await page.goto('/ops/web-vitals')
    const panel = page.getByTestId('alert-panel')
    await expect(panel).toBeVisible({ timeout: 5000 })
    // Widen the window so the 30-day seed always produces some red entries.
    await page.getByTestId('vitals-time-range-preset').selectOption('30d')
    const count = page.getByTestId('alert-count')
    await expect(count).toBeVisible()
    const text = await count.innerText()
    const match = text.match(/(\d+)/)
    expect(match).not.toBeNull()
    expect(Number(match![1])).toBeGreaterThan(0)
    // At least one alert row rendered in the (capped) list.
    await expect(panel.getByTestId('alert-row').first()).toBeVisible()
  })
})
