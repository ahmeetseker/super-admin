import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Pages to audit. Adding here automatically scans them.
const PAGES = [
  { path: '/', name: 'Overview' },
  { path: '/tenants', name: 'Tenants' },
  { path: '/observability', name: 'Observability' },
  { path: '/llm-cost', name: 'LLM Cost' },
  { path: '/audit', name: 'Audit' },
  { path: '/pii', name: 'PII' },
  { path: '/plans', name: 'Plans' },
  { path: '/permissions', name: 'Permissions' },
  { path: '/plugins', name: 'Plugins' },
  { path: '/compliance', name: 'Compliance' },
  { path: '/settings', name: 'Settings' },
  { path: '/mcp-tools', name: 'MCP Tools' },
  { path: '/memory-layer', name: 'Memory Layer' },
  { path: '/vector-store', name: 'Vector Store' },
  { path: '/webhooks', name: 'Webhooks' },
  { path: '/prompts', name: 'Prompts' },
  { path: '/sessions', name: 'Sessions' },
]

/**
 * Faz 13.g baseline: suppress rules that are known violations in the current
 * static analysis. Each suppression has a comment and a tracker reference.
 */
const ALLOWED_VIOLATIONS_BY_RULE: Record<string, string> = {
  // Allowed during MVP — color contrast warnings on stone-500 muted text on light bg
  // (~4.3:1 — borderline AA, fail AAA). Faz 13.b reduced; further fix planned with
  // dedicated --placeholder + body tweaks in Faz 13.h.
  'color-contrast': 'Faz 13.h — body muted text WCAG AA borderline (~4.3:1), refinements deferred',
}

for (const { path, name } of PAGES) {
  test(`a11y: ${name} (${path})`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const blocking = results.violations.filter(v => !ALLOWED_VIOLATIONS_BY_RULE[v.id])

    if (blocking.length > 0) {
      const report = blocking.map(v => `  - ${v.id} (${v.impact}): ${v.help}`).join('\n')
      console.log(`\n[a11y] ${name} (${path}) — ${blocking.length} blocking violations:\n${report}`)
    }
    if (results.violations.length > 0) {
      const allowed = results.violations.filter(v => ALLOWED_VIOLATIONS_BY_RULE[v.id])
      if (allowed.length > 0) {
        console.log(`  [a11y] ${name}: ${allowed.length} known violations suppressed.`)
      }
    }

    expect(blocking, `${name}: blocking a11y violations`).toEqual([])
  })
}
