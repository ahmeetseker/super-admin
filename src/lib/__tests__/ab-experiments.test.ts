import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createExperiment,
  deleteExperiment,
  getExperiment,
  getExperiments,
  resetExperimentsForTests,
  selectVariant,
  updateExperiment,
} from '@/lib/ab-experiments'

describe('ab-experiments store', () => {
  beforeEach(() => {
    resetExperimentsForTests()
  })
  afterEach(() => {
    resetExperimentsForTests()
  })

  it('seeds 3 experiments on first read', () => {
    expect(getExperiments().length).toBe(3)
  })

  it('createExperiment requires weights summing to 100', () => {
    expect(() =>
      createExperiment({
        key: 'new',
        name: 'New',
        variants: [
          { key: 'a', name: 'A', weight: 40 },
          { key: 'b', name: 'B', weight: 30 },
        ],
      }),
    ).toThrow()
  })

  it('createExperiment persists with draft status', () => {
    const exp = createExperiment({
      key: 'fresh',
      name: 'Fresh',
      variants: [
        { key: 'a', name: 'A', weight: 50 },
        { key: 'b', name: 'B', weight: 50 },
      ],
    })
    expect(exp.status).toBe('draft')
    expect(exp.variants.length).toBe(2)
  })

  it('createExperiment rejects duplicate key', () => {
    createExperiment({
      key: 'd',
      name: 'D',
      variants: [{ key: 'a', name: 'A', weight: 100 }],
    })
    expect(() =>
      createExperiment({
        key: 'd',
        name: 'D2',
        variants: [{ key: 'a', name: 'A', weight: 100 }],
      }),
    ).toThrow()
  })

  it('updateExperiment status flip works', () => {
    const seed = getExperiments()[0]
    const next = updateExperiment(seed.id, { status: 'paused' })
    expect(next?.status).toBe('paused')
    expect(getExperiment(seed.id)?.status).toBe('paused')
  })

  it('deleteExperiment removes the record', () => {
    const seed = getExperiments()[0]
    deleteExperiment(seed.id)
    expect(getExperiment(seed.id)).toBeNull()
  })
})

describe('selectVariant', () => {
  beforeEach(() => {
    resetExperimentsForTests()
  })
  afterEach(() => {
    resetExperimentsForTests()
  })

  it('returns null for non-running experiments', () => {
    expect(selectVariant('compare-cta-color', 'user_1')).toBeNull()
  })

  it('is deterministic for same (key, userId)', () => {
    const a = selectVariant('home-hero-headline', 'user_42')
    const b = selectVariant('home-hero-headline', 'user_42')
    expect(a?.id).toBe(b?.id)
  })

  it('returns null for unknown experiment key', () => {
    expect(selectVariant('does-not-exist', 'u')).toBeNull()
  })

  it('distributes users across variants', () => {
    const buckets: Record<string, number> = {}
    for (let i = 0; i < 200; i++) {
      const v = selectVariant('home-hero-headline', `u${i}`)
      if (v) buckets[v.key] = (buckets[v.key] ?? 0) + 1
    }
    // En az 2 farklı variant'a düşmüş olmalı
    expect(Object.keys(buckets).length).toBeGreaterThan(1)
  })
})
