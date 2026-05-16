import { test, expect } from './_fixtures/authenticated'

// Wave F21.B — /ops/security smoke. /security route'unu PageShell + IP
// allowlist + 2FA enforcement panelleri için sürer. localStorage her test
// öncesi sıfırlanır (F21.0 ip-allowlist + 2FA-policy keyleri) — seed
// deterministik kalır.

const ALLOWLIST_KEY = 'arsam.platform-ip-allowlist.v1'
const POLICY_KEY = 'arsam.platform-2fa-policy.v1'
const OPERATORS_KEY = 'arsam.platform-operators.v1'

test.beforeEach(async ({ authedPage }) => {
  await authedPage.addInitScript(
    ({ allow, policy, ops }) => {
      try {
        window.localStorage.removeItem(allow)
        window.localStorage.removeItem(policy)
        window.localStorage.removeItem(ops)
      } catch {
        /* localStorage unavailable */
      }
    },
    { allow: ALLOWLIST_KEY, policy: POLICY_KEY, ops: OPERATORS_KEY },
  )
})

test.describe('super-admin /security', () => {
  test('renders the PageShell + IP allowlist + 2FA panels', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/security')
    await expect(page.getByTestId('security-summary')).toBeVisible()
    await expect(page.getByTestId('ip-allowlist-panel')).toBeVisible()
    await expect(page.getByTestId('twofa-enforcement-card')).toBeVisible()
    await expect(page.getByTestId('twofa-policy-panel')).toBeVisible()
    // First mount → allowlist boş.
    await expect(page.getByTestId('ip-allowlist-empty')).toBeVisible()
  })

  test('add CIDR modal — invalid input blocks submit, valid input persists', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/security')
    await page.getByTestId('ip-allowlist-add-cta').click()
    const modal = page.getByTestId('add-cidr-modal')
    await expect(modal).toBeVisible()

    const submit = page.getByTestId('add-cidr-submit')
    await expect(submit).toBeDisabled()

    await page.getByTestId('add-cidr-input').fill('garbage')
    await expect(page.getByTestId('add-cidr-invalid')).toBeVisible()
    await expect(submit).toBeDisabled()

    await page.getByTestId('add-cidr-input').fill('10.0.0.0/24')
    await expect(page.getByTestId('add-cidr-size')).toContainText('IP')
    await page.getByTestId('add-cidr-label').fill('Ofis')
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(modal).toBeHidden()
    await expect(page.getByTestId('ip-allowlist-row')).toHaveCount(1)
    await expect(page.getByTestId('ip-allowlist-row')).toContainText(
      '10.0.0.0/24',
    )
  })

  test('removing a CIDR row clears the table back to empty', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/security')
    await page.getByTestId('ip-allowlist-add-cta').click()
    await page.getByTestId('add-cidr-input').fill('192.168.1.0/24')
    await page.getByTestId('add-cidr-submit').click()
    await expect(page.getByTestId('ip-allowlist-row')).toHaveCount(1)

    await page.getByTestId('ip-allowlist-remove').click()
    await expect(page.getByTestId('ip-allowlist-row')).toHaveCount(0)
    await expect(page.getByTestId('ip-allowlist-empty')).toBeVisible()
  })

  test('2FA policy toggle flips visual state for the row', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/security')
    const firstRow = page.getByTestId('twofa-policy-row').first()
    const state = firstRow.getByTestId('twofa-policy-state')
    await expect(state).toContainText('Opsiyonel')

    await firstRow.getByTestId('twofa-policy-toggle').click()
    await expect(state).toContainText('Zorunlu')
    await expect(firstRow.getByTestId('twofa-policy-toggle')).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('coverage card lists missing operators from the seed', async ({
    authedPage: page,
  }) => {
    await page.goto('/ops/security')
    // Operator seed her zaman 2FA enroll'lu olmayan en az 1 kayıt üretir.
    const missing = page.getByTestId('twofa-missing-row')
    await expect(missing.first()).toBeVisible()
  })
})
