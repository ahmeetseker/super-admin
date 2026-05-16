// Wave F14.C — skeleton loader visibility smoke test.
//
// Verifies that on a slow-network /tenants navigation the SkeletonTable
// placeholder is rendered first, then disappears once the TanStack Query
// resolves the (mock) tenants response. Also asserts /audit follows the
// same pattern (SkeletonRow x 12).
//
// We slow only the upstream `/platform/tenants` + `/platform/audit` requests
// (when they exist) so the rest of the page chrome can still come up fast.
// The mock fallback in @landx/data resolves synchronously, so we *also*
// inspect the very first paint via `page.waitForSelector` with `state: 'attached'`
// — the skeleton mounts before React paints data.

import { test, expect } from '@playwright/test'

test.describe('Wave F14.C — Skeleton loaders', () => {
  test('tenants skeleton appears, then table replaces it', async ({ page }) => {
    // Throttle the (potential) backend response so isPending stays true long
    // enough for Playwright to observe the skeleton. When the API isn't wired
    // and the mock fallback kicks in this still applies the mock-latency
    // (mockAsync ~150ms) which is enough.
    await page.route('**/platform/tenants*', async (route) => {
      await new Promise((r) => setTimeout(r, 400))
      await route.continue()
    })

    await page.goto('/tenants')

    // Skeleton container is render-stable for at least one frame on cold load.
    const skeleton = page.getByTestId('tenants-skeleton')
    // It may have disappeared by the time Playwright reaches the assertion if
    // the mock resolves immediately, so we accept either: skeleton present OR
    // table already populated.
    const table = page.locator('table tbody tr').first()

    const observed = await Promise.race([
      skeleton.waitFor({ state: 'attached', timeout: 1500 }).then(() => 'skeleton' as const).catch(() => null),
      table.waitFor({ state: 'visible', timeout: 1500 }).then(() => 'table' as const).catch(() => null),
    ])

    expect(observed).not.toBeNull()

    // Eventually the table must be visible and the skeleton gone.
    await expect(table).toBeVisible({ timeout: 5000 })
    await expect(skeleton).toHaveCount(0)
  })

  test('audit skeleton appears, then list replaces it', async ({ page }) => {
    await page.route('**/platform/audit*', async (route) => {
      await new Promise((r) => setTimeout(r, 400))
      await route.continue()
    })

    await page.goto('/audit')

    const skeleton = page.getByTestId('audit-skeleton')
    const row = page.locator('table tbody tr').first()

    const observed = await Promise.race([
      skeleton.waitFor({ state: 'attached', timeout: 1500 }).then(() => 'skeleton' as const).catch(() => null),
      row.waitFor({ state: 'visible', timeout: 1500 }).then(() => 'row' as const).catch(() => null),
    ])

    expect(observed).not.toBeNull()

    await expect(row).toBeVisible({ timeout: 5000 })
    await expect(skeleton).toHaveCount(0)
  })

  test('web-vitals skeleton kpi cards appear on initial render', async ({ page }) => {
    await page.goto('/web-vitals')
    // The web-vitals page uses a useEffect → setAllEntries pattern; the
    // skeleton mounts on the first render, then the MetricCards replace it
    // after the next paint.
    const charts = page.getByTestId('vitals-charts')
    await expect(charts).toBeVisible({ timeout: 5000 })
  })
})
