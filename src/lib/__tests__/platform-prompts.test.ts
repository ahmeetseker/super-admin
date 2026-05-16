// Tests for lib/platform-prompts.ts.
// Covers seed determinism, 15-prompt × 3-5-version layout, group aggregation,
// line-diff op order, and template-length contract.
// F13.E: in-memory localStorage shim moved to apps/super-admin/vitest.setup.ts.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  _buildSeedPrompts,
  _resetPromptsForTests,
  CHANGE_REASONS,
  PROMPT_NAMES,
  STORAGE_KEY_FOR_TESTS,
  diffLines,
  getPromptGroup,
  getPromptGroups,
  getPromptVersions,
} from '@/lib/platform-prompts'

describe('platform-prompts', () => {
  beforeEach(() => {
    _resetPromptsForTests()
  })

  it('seeds exactly 15 prompts and persists to storage', () => {
    const groups = getPromptGroups()
    expect(groups).toHaveLength(PROMPT_NAMES.length)
    expect(groups).toHaveLength(15)
    const raw = window.localStorage.getItem(STORAGE_KEY_FOR_TESTS)
    expect(raw).toBeTruthy()
  })

  it('seed is deterministic — two builds match', () => {
    const refNow = Date.parse('2026-05-14T00:00:00.000Z')
    const a = _buildSeedPrompts(refNow)
    const b = _buildSeedPrompts(refNow)
    expect(a).toEqual(b)
  })

  it('each prompt has 3-5 versions', () => {
    const groups = getPromptGroups()
    for (const g of groups) {
      expect(g.versions.length).toBeGreaterThanOrEqual(3)
      expect(g.versions.length).toBeLessThanOrEqual(5)
    }
  })

  it('exactly one active version per prompt; rest are archived', () => {
    const groups = getPromptGroups()
    for (const g of groups) {
      const active = g.versions.filter((v) => v.status === 'active')
      const archived = g.versions.filter((v) => v.status === 'archived')
      expect(active).toHaveLength(1)
      expect(archived.length).toBe(g.versions.length - 1)
      expect(g.activeVersion.status).toBe('active')
    }
  })

  it('template length stays within 200-400 characters', () => {
    const all = getPromptVersions()
    for (const v of all) {
      expect(v.template.length).toBeGreaterThanOrEqual(200)
      expect(v.template.length).toBeLessThanOrEqual(400)
    }
  })

  it('changeReason on v1.0 is "İlk sürüm"; later versions use the canonical 4-reason set', () => {
    const all = getPromptVersions()
    const v1s = all.filter((v) => v.version === 'v1.0')
    const others = all.filter((v) => v.version !== 'v1.0')
    expect(v1s.every((v) => v.changeReason === 'İlk sürüm')).toBe(true)
    const allowed = new Set<string>(CHANGE_REASONS as unknown as string[])
    for (const v of others) {
      expect(allowed.has(v.changeReason)).toBe(true)
    }
  })

  it('versions inside a group are sorted oldest → newest by createdAt', () => {
    const groups = getPromptGroups()
    for (const g of groups) {
      for (let i = 1; i < g.versions.length; i++) {
        expect(g.versions[i].createdAtMs).toBeGreaterThanOrEqual(g.versions[i - 1].createdAtMs)
      }
    }
  })

  it('getPromptGroup returns the right group by id', () => {
    const groups = getPromptGroups()
    const target = groups[0]
    const found = getPromptGroup(target.promptId)
    expect(found).toBeDefined()
    expect(found!.name).toBe(target.name)
    expect(getPromptGroup('does-not-exist')).toBeUndefined()
  })

  it('diffLines: identical text → all "eq" ops', () => {
    const t = 'a\nb\nc'
    const ops = diffLines(t, t)
    expect(ops.every((o) => o.op === 'eq')).toBe(true)
    expect(ops).toHaveLength(3)
  })

  it('diffLines: pure addition emits "add" ops only for the tail', () => {
    const left = 'a\nb'
    const right = 'a\nb\nc\nd'
    const ops = diffLines(left, right)
    expect(ops[0].op).toBe('eq')
    expect(ops[1].op).toBe('eq')
    expect(ops[2].op).toBe('add')
    expect(ops[2].right).toBe('c')
    expect(ops[3].op).toBe('add')
    expect(ops[3].right).toBe('d')
  })

  it('diffLines: pure removal emits "del" ops only for the tail', () => {
    const left = 'a\nb\nc'
    const right = 'a'
    const ops = diffLines(left, right)
    expect(ops[0].op).toBe('eq')
    expect(ops[1].op).toBe('del')
    expect(ops[1].left).toBe('b')
    expect(ops[2].op).toBe('del')
    expect(ops[2].left).toBe('c')
  })

  it('diffLines: differing line at same index emits del + add pair', () => {
    const left = 'a\nOLD\nc'
    const right = 'a\nNEW\nc'
    const ops = diffLines(left, right)
    // Expected: eq, del(OLD), add(NEW), eq
    expect(ops).toHaveLength(4)
    expect(ops[0].op).toBe('eq')
    expect(ops[1].op).toBe('del')
    expect(ops[1].left).toBe('OLD')
    expect(ops[2].op).toBe('add')
    expect(ops[2].right).toBe('NEW')
    expect(ops[3].op).toBe('eq')
  })

  it('malformed storage falls back to seed on next read', () => {
    window.localStorage.setItem(STORAGE_KEY_FOR_TESTS, 'not-json{')
    _resetPromptsForTests()
    const groups = getPromptGroups()
    expect(groups).toHaveLength(15)
  })
})
