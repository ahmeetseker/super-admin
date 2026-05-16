import { test, expect } from '@playwright/test'

const FREEZE_ANIM_CSS =
  '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }'

// Pages screenshotted across every viewport project (desktop / mobile / tablet).
// Playwright project name is suffixed automatically into the snapshot dir.
const PAGES = [
  { path: '/', name: 'home' },
  { path: '/tenants', name: 'tenants' },
  { path: '/tenants/atolye-ayv', name: 'tenant-detail' },
  { path: '/observability', name: 'observability' },
  { path: '/llm-cost', name: 'llm-cost' },
  { path: '/audit', name: 'audit' },
  { path: '/pii', name: 'pii' },
  { path: '/plans', name: 'plans' },
  { path: '/permissions', name: 'permissions' },
  { path: '/plugins', name: 'plugins' },
  { path: '/compliance', name: 'compliance' },
  { path: '/settings', name: 'settings' },
  { path: '/mcp-tools', name: 'mcp-tools' },
  { path: '/memory-layer', name: 'memory-layer' },
  { path: '/vector-store', name: 'vector-store' },
  { path: '/webhooks', name: 'webhooks' },
  { path: '/prompts', name: 'prompts' },
  { path: '/sessions', name: 'sessions' },
] as const

test.describe('Visual regression', () => {
  for (const { path, name } of PAGES) {
    test(`screenshot: ${name} (${path})`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      await page.addStyleTag({ content: FREEZE_ANIM_CSS })
      await expect(page).toHaveScreenshot(`super-${name}.png`, {
        fullPage: false,
      })
    })
  }
})
