import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  exportCatalogJson,
  findMissingEnglish,
  getCatalogEntries,
  getNamespaces,
  resetCatalogForTests,
  resetCatalogString,
  updateCatalogString,
} from '@/lib/i18n-catalog'

describe('i18n-catalog', () => {
  beforeEach(() => {
    resetCatalogForTests()
  })
  afterEach(() => {
    resetCatalogForTests()
  })

  it('returns seed entries with namespace + key + tr + en', () => {
    const entries = getCatalogEntries()
    expect(entries.length).toBeGreaterThanOrEqual(20)
    for (const row of entries) {
      expect(row.key).toBeTruthy()
      expect(row.namespace).toBeTruthy()
      expect(typeof row.tr).toBe('string')
      expect(typeof row.en).toBe('string')
    }
  })

  it('getNamespaces returns deduped sorted list', () => {
    const ns = getNamespaces()
    expect(ns).toContain('common')
    expect(ns).toContain('nav')
    expect(ns).toContain('auth')
    expect([...ns].sort()).toEqual(ns)
  })

  it('findMissingEnglish returns empty list when seed is complete', () => {
    expect(findMissingEnglish()).toEqual([])
  })

  it('updateCatalogString persists override + bumps modifiedISO', () => {
    const updated = updateCatalogString({ key: 'common.save', en: 'Persist' })
    expect(updated?.en).toBe('Persist')
    expect(updated?.modifiedISO).toBeTruthy()
    expect(getCatalogEntries().find((r) => r.key === 'common.save')?.en).toBe('Persist')
  })

  it('resetCatalogString reverts to seed', () => {
    updateCatalogString({ key: 'common.save', en: 'Persist' })
    resetCatalogString('common.save')
    expect(getCatalogEntries().find((r) => r.key === 'common.save')?.en).toBe('Save')
  })

  it('updateCatalogString rejects unknown keys', () => {
    expect(updateCatalogString({ key: 'does.not.exist', tr: 'x' })).toBeNull()
  })

  it('exportCatalogJson groups by namespace', () => {
    const json = exportCatalogJson()
    const parsed = JSON.parse(json)
    expect(parsed.tr).toBeTruthy()
    expect(parsed.en).toBeTruthy()
    expect(parsed.tr.common).toBeTruthy()
    expect(parsed.en.common).toBeTruthy()
  })
})
