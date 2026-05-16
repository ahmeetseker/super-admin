// Wave F11.B — platform-plugins.ts unit tests.
// F13.E: in-memory localStorage shim moved to apps/super-admin/vitest.setup.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getInstalledPlugins,
  getMarketplacePlugins,
  getPlugin,
  installPlugin,
  uninstallPlugin,
  updatePluginConfig,
  setPluginStatus,
  resetPluginsForTests,
  labelPermission,
} from '@/lib/platform-plugins'

beforeEach(() => {
  resetPluginsForTests()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('platform-plugins.ts — seed', () => {
  it('seeds 12 installed plugins on first read', () => {
    const list = getInstalledPlugins()
    expect(list).toHaveLength(12)
    // Determinism: same set across calls.
    expect(getInstalledPlugins().map((p) => p.id)).toEqual(list.map((p) => p.id))
  })

  it('seeds 10 active, 1 disabled, 1 error plugins', () => {
    const list = getInstalledPlugins()
    expect(list.filter((p) => p.status === 'active')).toHaveLength(10)
    expect(list.filter((p) => p.status === 'disabled')).toHaveLength(1)
    expect(list.filter((p) => p.status === 'error')).toHaveLength(1)
  })

  it('seeds 20 marketplace plugins (varied categories, ratings 3.5-4.9)', () => {
    const list = getMarketplacePlugins()
    expect(list).toHaveLength(20)
    const categories = new Set(list.map((p) => p.category))
    expect(categories.size).toBeGreaterThanOrEqual(4)
    for (const p of list) {
      expect(p.rating).toBeGreaterThanOrEqual(3.5)
      expect(p.rating).toBeLessThanOrEqual(4.9)
    }
  })
})

describe('platform-plugins.ts — install async', () => {
  it('install transitions status=installing → active after 1000ms', () => {
    const target = getMarketplacePlugins()[0]
    const installing = installPlugin(target.id)
    expect(installing.status).toBe('installing')
    expect(installing.installedAt).toBeTypeOf('number')

    // After move, plugin is in installed list.
    expect(getInstalledPlugins().some((p) => p.id === target.id)).toBe(true)
    expect(getInstalledPlugins().find((p) => p.id === target.id)?.status).toBe('installing')

    // And gone from marketplace.
    expect(getMarketplacePlugins().some((p) => p.id === target.id)).toBe(false)

    // Advance timers — status flips to active.
    vi.advanceTimersByTime(1000)
    const after = getInstalledPlugins().find((p) => p.id === target.id)
    expect(after?.status).toBe('active')
  })

  it('install rejects duplicate (already installed)', () => {
    const installed = getInstalledPlugins()[0]
    expect(() => installPlugin(installed.id)).toThrowError(/already installed/i)
  })

  it('install rejects unknown plugin id', () => {
    expect(() => installPlugin('mp-does-not-exist-xyz')).toThrowError(/not found/i)
  })
})

describe('platform-plugins.ts — uninstall', () => {
  it('uninstall removes from installed and restores to marketplace', () => {
    const target = getInstalledPlugins()[0]
    uninstallPlugin(target.id)
    expect(getInstalledPlugins().some((p) => p.id === target.id)).toBe(false)
    expect(getMarketplacePlugins().some((p) => p.id === target.id)).toBe(true)
  })

  it('uninstall on unknown id is a no-op', () => {
    const before = getInstalledPlugins().length
    uninstallPlugin('pl-does-not-exist-xyz')
    expect(getInstalledPlugins()).toHaveLength(before)
  })
})

describe('platform-plugins.ts — config + status', () => {
  it('updatePluginConfig persists new config', () => {
    const target = getInstalledPlugins()[0]
    const next = { syncInterval: '30m', autoPublish: false, customFlag: 'on' }
    const updated = updatePluginConfig(target.id, next)
    expect(updated?.config).toEqual(next)
    expect(getPlugin(target.id)?.config).toEqual(next)
  })

  it('setPluginStatus disables an active plugin', () => {
    const active = getInstalledPlugins().find((p) => p.status === 'active')!
    setPluginStatus(active.id, 'disabled')
    expect(getPlugin(active.id)?.status).toBe('disabled')
  })
})

describe('platform-plugins.ts — resilience', () => {
  it('malformed localStorage payload is reseeded', () => {
    window.localStorage.setItem('arsam.platform-plugins.v1', '{not json')
    expect(getInstalledPlugins()).toHaveLength(12)
  })

  it('empty / null localStorage payload is reseeded', () => {
    window.localStorage.setItem('arsam.platform-plugins.v1', 'null')
    expect(getInstalledPlugins()).toHaveLength(12)
  })

  it('marketplace dedupe: installed ids are not in marketplace results', () => {
    const installedIds = new Set(getInstalledPlugins().map((p) => p.id))
    for (const m of getMarketplacePlugins()) {
      expect(installedIds.has(m.id)).toBe(false)
    }
  })

  it('labelPermission returns TR label for known perm; passes through unknown', () => {
    expect(labelPermission('ilan.read')).toMatch(/oku/i)
    expect(labelPermission('unknown.perm.xyz')).toBe('unknown.perm.xyz')
  })
})
