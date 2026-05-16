import { describe, it, expect, vi } from 'vitest'
import {
  SHORTCUTS,
  SEQUENCE_TIMEOUT_MS,
  findShortcut,
  groupShortcuts,
  isEditableTarget,
  type ShortcutContext,
} from '@/lib/keyboard-shortcuts'

function makeCtx(): ShortcutContext {
  return {
    navigate: vi.fn(),
    openOverlay: vi.fn(),
    closeOverlay: vi.fn(),
    openCommandPalette: vi.fn(),
    closeCommandPalette: vi.fn(),
  }
}

describe('super-admin keyboard-shortcuts registry', () => {
  it('exposes a non-empty registry', () => {
    expect(SHORTCUTS.length).toBeGreaterThan(0)
    for (const s of SHORTCUTS) {
      expect(typeof s.keys).toBe('string')
      expect(typeof s.label).toBe('string')
      expect(['global', 'route']).toContain(s.scope)
      expect(typeof s.handler).toBe('function')
    }
  })

  it('covers the required super-admin navigation bindings', () => {
    const required = ['g o', 'g t', 'g p', 'g l', 'g v']
    for (const k of required) {
      expect(findShortcut(k), `missing ${k}`).toBeDefined()
    }
  })

  it('registers ?, shift+/ and Escape for the overlay', () => {
    expect(findShortcut('?')).toBeDefined()
    expect(findShortcut('shift+/')).toBeDefined()
    expect(findShortcut('Escape')).toBeDefined()
  })

  it('SEQUENCE_TIMEOUT_MS is generous enough', () => {
    expect(SEQUENCE_TIMEOUT_MS).toBeGreaterThanOrEqual(800)
    expect(SEQUENCE_TIMEOUT_MS).toBeLessThanOrEqual(2000)
  })

  describe('handlers', () => {
    it('`g o` navigates to /', () => {
      const ctx = makeCtx()
      findShortcut('g o')!.handler(ctx)
      expect(ctx.navigate).toHaveBeenCalledWith('/')
    })

    it('`g t` navigates to /tenants', () => {
      const ctx = makeCtx()
      findShortcut('g t')!.handler(ctx)
      expect(ctx.navigate).toHaveBeenCalledWith('/tenants')
    })

    it('`?` opens overlay; Escape closes', () => {
      const ctx = makeCtx()
      findShortcut('?')!.handler(ctx)
      expect(ctx.openOverlay).toHaveBeenCalledTimes(1)
      findShortcut('Escape')!.handler(ctx)
      expect(ctx.closeOverlay).toHaveBeenCalledTimes(1)
    })

    it('`mod+/` opens the command palette', () => {
      const ctx = makeCtx()
      findShortcut('mod+/')!.handler(ctx)
      expect(ctx.openCommandPalette).toHaveBeenCalledTimes(1)
    })
  })

  describe('groupShortcuts', () => {
    it('returns every shortcut bucketed by group', () => {
      const grouped = groupShortcuts()
      const total =
        grouped.navigation.length +
        grouped.overlay.length +
        grouped.general.length +
        grouped.palette.length
      expect(total).toBe(SHORTCUTS.length)
    })

    it('palette group contains mod+/', () => {
      const grouped = groupShortcuts()
      expect(grouped.palette.map((s) => s.keys)).toContain('mod+/')
    })
  })

  describe('isEditableTarget', () => {
    it('treats <input>, <textarea>, <select> as editable', () => {
      for (const tag of ['input', 'textarea', 'select']) {
        const el = document.createElement(tag)
        expect(isEditableTarget(el)).toBe(true)
      }
    })

    it('treats contenteditable elements as editable', () => {
      const el = document.createElement('div')
      Object.defineProperty(el, 'isContentEditable', { value: true, configurable: true })
      expect(isEditableTarget(el)).toBe(true)
    })

    it('treats null and non-form elements as non-editable', () => {
      expect(isEditableTarget(null)).toBe(false)
      expect(isEditableTarget(document.createElement('button'))).toBe(false)
    })
  })
})
