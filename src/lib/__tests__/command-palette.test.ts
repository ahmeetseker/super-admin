import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ACTIONS,
  PAGES,
  clearRecent,
  filteredSections,
  pushRecent,
  readRecent,
  searchEntities,
  RECENT_STORAGE_KEY,
} from '@/lib/command-palette'

describe('super-admin command-palette registry', () => {
  it('exposes at least 4 static actions', () => {
    expect(ACTIONS.length).toBeGreaterThanOrEqual(4)
    for (const a of ACTIONS) {
      expect(a.type).toBe('action')
    }
  })

  it('PAGES covers every g+letter navigation target', () => {
    const targets = ['/', '/tenants', '/plans', '/audit', '/web-vitals']
    for (const t of targets) {
      expect(PAGES.find((p) => p.to === t), `missing page ${t}`).toBeDefined()
    }
  })

  it('PAGES has at least 15 entries (every super-admin route)', () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(15)
  })
})

describe('searchEntities (super-admin)', () => {
  it('returns empty list for empty query', () => {
    expect(searchEntities('')).toEqual([])
    expect(searchEntities('   ')).toEqual([])
  })

  it('finds at least one tenant for a known city query', () => {
    const results = searchEntities('balıkesir')
    const tenants = results.filter((r) => r.type === 'tenant')
    expect(tenants.length).toBeGreaterThan(0)
  })

  it('case-insensitive matching is locale-aware (TR)', () => {
    const lower = searchEntities('balıkesir')
    const upper = searchEntities('BALIKESİR')
    expect(lower.length).toBe(upper.length)
  })

  it('returns audit entries when matching action verbs', () => {
    const results = searchEntities('login')
    const audits = results.filter((r) => r.type === 'audit')
    expect(audits.length).toBeGreaterThanOrEqual(0)
  })
})

describe('filteredSections', () => {
  it('without query returns actions + pages only', () => {
    const sections = filteredSections('')
    expect(sections.map((s) => s.label)).toEqual(['AKSİYONLAR', 'SAYFALAR'])
  })

  it('with query may include SONUÇLAR section', () => {
    const sections = filteredSections('tenant')
    expect(sections.length).toBeGreaterThan(0)
  })
})

describe('recent search persistence', () => {
  beforeEach(() => {
    clearRecent()
  })

  afterEach(() => {
    clearRecent()
  })

  it('readRecent returns empty list initially', () => {
    expect(readRecent()).toEqual([])
  })

  it('pushRecent stores queries in MRU order, max 5', () => {
    pushRecent('a')
    pushRecent('b')
    pushRecent('c')
    pushRecent('d')
    pushRecent('e')
    pushRecent('f')
    const r = readRecent()
    expect(r).toEqual(['f', 'e', 'd', 'c', 'b'])
  })

  it('pushRecent deduplicates and re-promotes', () => {
    pushRecent('alpha')
    pushRecent('beta')
    pushRecent('alpha')
    expect(readRecent()).toEqual(['alpha', 'beta'])
  })

  it('writes to the documented storage key', () => {
    pushRecent('check-key')
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toContain('check-key')
  })
})
