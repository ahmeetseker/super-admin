// Wave F21.C — super-admin /data-rights E2E smoke.
//
// Covers the three F21.C dashboard sections:
//   1. ExportRequestForm — preview + Blob download (download intercepted via
//      Playwright's `waitForEvent('download')`).
//   2. DeleteWorkflow — 4-step (preview → wrong text → correct text →
//      countdown → done), with a separate cancel-during-countdown spec.
//   3. RequestHistoryTable — surfaces the audit entries that the two flows
//      land into localStorage.
//
// Auth is supplied by the shared authedPage fixture (F13.E).

import { expect } from '@playwright/test'
import { test } from './_fixtures/authenticated'

test.beforeEach(async ({ authedPage }) => {
  // Wipe the data-rights audit trail so each spec starts deterministic.
  await authedPage.addInitScript(() => {
    try {
      window.localStorage.removeItem('arsam.platform-data-rights.v1')
    } catch {
      /* localStorage unavailable */
    }
  })
})

test.describe('super-admin /data-rights', () => {
  test('renders the dashboard with all three sections', async ({ authedPage: page }) => {
    await page.goto('/data-rights')
    await expect(page.getByTestId('data-rights-dashboard')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('export-request-form')).toBeVisible()
    await expect(page.getByTestId('delete-workflow-collapsed')).toBeVisible()
    await expect(page.getByTestId('request-history-table')).toBeVisible()
  })

  test('export flow: tenant seç → preview → download triggers an audit row', async ({
    authedPage: page,
  }) => {
    await page.goto('/data-rights')
    await expect(page.getByTestId('export-request-form')).toBeVisible({ timeout: 5000 })

    await page.getByTestId('export-preview-button').click()
    await expect(page.getByTestId('export-preview-card')).toBeVisible()
    await expect(page.getByTestId('export-filename')).toContainText(/\.json$/)

    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('export-download-button').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.json$/)

    await expect(page.getByTestId('export-status-completed')).toBeVisible()
    // History table reflects the new export row
    const exportRow = page.locator('[data-testid^="request-history-row-"][data-kind="export"]')
    await expect(exportRow.first()).toBeVisible()
  })

  test('delete flow: preview → wrong text → correct text → countdown → done', async ({
    authedPage: page,
  }) => {
    await page.goto('/data-rights')
    await expect(page.getByTestId('delete-workflow-collapsed')).toBeVisible({ timeout: 5000 })

    await page.getByTestId('delete-workflow-start').click()
    await expect(page.getByTestId('delete-step-preview')).toBeVisible()
    await expect(page.getByTestId('cascade-preview-card')).toBeVisible()

    await page.getByTestId('delete-step-preview-next').click()
    await expect(page.getByTestId('delete-step-confirm')).toBeVisible()

    // Wrong text — next stays disabled
    await page.getByTestId('delete-confirm-input').fill('SIL test')
    await expect(page.getByTestId('delete-step-confirm-next')).toBeDisabled()

    // Read the expected phrase from the rendered label so this test stays
    // agnostic of which tenant the select defaults to.
    const phrase = await page
      .locator('label[for="delete-confirm"] span')
      .innerText()
    await page.getByTestId('delete-confirm-input').fill(phrase)
    await expect(page.getByTestId('delete-step-confirm-next')).toBeEnabled()

    await page.getByTestId('delete-step-confirm-next').click()
    await expect(page.getByTestId('delete-step-countdown')).toBeVisible()

    // Wait up to 5s for the 3s countdown to land on "done".
    await expect(page.getByTestId('delete-step-done')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('delete-success-banner')).toBeVisible()

    // History reflects the delete row
    const deleteRow = page.locator('[data-testid^="request-history-row-"][data-kind="delete"]')
    await expect(deleteRow.first()).toBeVisible()
  })

  test('cancel during countdown returns to preview without committing', async ({
    authedPage: page,
  }) => {
    await page.goto('/data-rights')
    await page.getByTestId('delete-workflow-start').click()
    await page.getByTestId('delete-step-preview-next').click()
    const phrase = await page
      .locator('label[for="delete-confirm"] span')
      .innerText()
    await page.getByTestId('delete-confirm-input').fill(phrase)
    await page.getByTestId('delete-step-confirm-next').click()
    await expect(page.getByTestId('delete-step-countdown')).toBeVisible()
    await page.getByTestId('delete-step-countdown-cancel').click()
    await expect(page.getByTestId('delete-step-preview')).toBeVisible()
    // No delete row should appear in history.
    await expect(
      page.locator('[data-testid^="request-history-row-"][data-kind="delete"]'),
    ).toHaveCount(0)
  })

  test('history table shows recent requests with status pills', async ({ authedPage: page }) => {
    await page.goto('/data-rights')
    await expect(page.getByTestId('request-history-table')).toBeVisible({ timeout: 5000 })
    // Empty state initially (fresh localStorage)
    await expect(page.getByTestId('request-history-empty')).toBeVisible()

    // Trigger an export so we know something will land in history
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('export-preview-button').click()
    await page.getByTestId('export-download-button').click()
    await downloadPromise

    // History row appears with a status pill
    const row = page.locator('[data-testid^="request-history-row-"]').first()
    await expect(row).toBeVisible()
    await expect(row.locator('[data-testid^="request-history-status-"]')).toBeVisible()
  })
})
