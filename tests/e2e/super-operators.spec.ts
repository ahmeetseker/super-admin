// Wave F21.A — /ops/operators E2E.
// Clears the F21.0 operator-store before each case so the SUSPEND/INVITE
// flows land on a deterministic seed (5 ROLES.members rows). Auth is wired
// through the shared authedPage fixture (F13.E).

import { test, expect } from './_fixtures/authenticated'

const OPERATORS_KEY = 'arsam.platform-operators.v1'

test.beforeEach(async ({ authedPage }) => {
  await authedPage.addInitScript((key) => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* localStorage unavailable */
    }
  }, OPERATORS_KEY)
})

test.describe('super-admin /operators', () => {
  test('renders the operator table seeded from ROLES', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/operators')
    await expect(page.getByTestId('operator-table-section')).toBeVisible()
    await expect(page.getByTestId('operator-coverage-row')).toBeVisible()
    // Spot-check a couple of seeded operators (super-admin + support).
    await expect(page.getByText('ahmet@turksab.com')).toBeVisible()
    await expect(page.getByText('destek@turksab.com').first()).toBeVisible()
  })

  test('opens the invite drawer when the CTA is clicked', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/operators')
    await page.getByTestId('operator-invite-cta').click()
    const dialog = page.getByTestId('operator-form-modal')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Formu kapat' }).click()
    await expect(dialog).toBeHidden()
  })

  test('creates a new operator and surfaces them in the table', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/operators')
    await page.getByTestId('operator-invite-cta').click()
    await page
      .getByTestId('operator-email-input')
      .fill('e2e-yeni@turksab.com')
    await page
      .getByTestId('operator-role-select')
      .selectOption('compliance')
    await page.getByTestId('operator-form-submit').click()
    await expect(page.getByTestId('operator-form-modal')).toBeHidden()
    await expect(page.getByText('e2e-yeni@turksab.com')).toBeVisible()
  })

  test('suspend action moves an active operator into the Askıda filter', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/operators')
    // Find a seeded super-admin row by email and trigger the action menu.
    const ahmetRow = page.locator('tr', { hasText: 'ahmet@turksab.com' })
    await expect(ahmetRow).toBeVisible()
    await ahmetRow.getByRole('button', { name: /aksiyon/i }).click()
    await page.getByRole('menuitem', { name: 'Askıya al' }).click()
    // Switch the status filter to Askıda and confirm the row is now there.
    await page.getByTestId('operator-status-filter-suspended').click()
    await expect(
      page.locator('tr', { hasText: 'ahmet@turksab.com' }),
    ).toBeVisible()
  })

  test('self-audit panel renders for the active super-admin', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/operators')
    const panel = page.getByTestId('operator-self-audit-panel')
    await expect(panel).toBeVisible()
    // Curated AUDIT_LOG seed has rows for ahmet@turksab.com, so at least one
    // self-audit-entry-* should be present.
    await expect(
      panel.locator('[data-testid^="self-audit-entry-"]').first(),
    ).toBeVisible()
  })
})
