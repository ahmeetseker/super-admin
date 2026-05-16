import { test } from './_fixtures/authenticated'
import { expect } from '@playwright/test'

test.describe('super-admin command palette (F16.A)', () => {
  test('mod+/ opens the palette and narrows results', async ({ authedPage: page }) => {
    await page.goto('/')
    await page.keyboard.press('ControlOrMeta+/')
    const dialog = page.getByRole('dialog', { name: 'Komut paleti' })
    await expect(dialog).toBeVisible()

    const input = page.getByTestId('command-palette-input')
    await expect(input).toBeFocused()

    await input.fill('tenant')
    await expect(page.getByText(/SAYFALAR|SONUÇLAR|AKSİYONLAR/).first()).toBeVisible()
  })

  test('Escape closes the palette', async ({ authedPage: page }) => {
    await page.goto('/')
    await page.keyboard.press('ControlOrMeta+/')
    await expect(page.getByRole('dialog', { name: 'Komut paleti' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Komut paleti' })).not.toBeVisible()
  })

  test('backdrop click closes the palette', async ({ authedPage: page }) => {
    await page.goto('/')
    await page.keyboard.press('ControlOrMeta+/')
    const dialog = page.getByRole('dialog', { name: 'Komut paleti' })
    await expect(dialog).toBeVisible()
    await dialog.click({ position: { x: 5, y: 5 } })
    await expect(dialog).not.toBeVisible()
  })

  test('Enter activates first item; palette closes', async ({ authedPage: page }) => {
    await page.goto('/')
    await page.keyboard.press('ControlOrMeta+/')
    await expect(page.getByTestId('command-palette-input')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Komut paleti' })).not.toBeVisible()
  })
})
