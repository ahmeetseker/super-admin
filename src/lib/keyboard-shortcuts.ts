/**
 * F14.B — super-admin keyboard shortcut registry. Mirror of the atolye-admin
 * registry but bound to /ops routes (overview, tenants, plans, audit,
 * web-vitals). Single source of truth for both the global key listener
 * (use-keyboard-shortcuts) and the overlay renderer (ShortcutsOverlay).
 */

export type ShortcutScope = 'global' | 'route'

export interface ShortcutContext {
  navigate: (to: string) => void
  openOverlay: () => void
  closeOverlay: () => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
}

export interface Shortcut {
  keys: string
  label: string
  scope: ShortcutScope
  group: 'navigation' | 'overlay' | 'general' | 'palette'
  handler: (ctx: ShortcutContext) => void
}

export const SEQUENCE_TIMEOUT_MS = 1200

export const SHORTCUTS: ReadonlyArray<Shortcut> = [
  {
    keys: 'g o',
    label: 'Overview',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/'),
  },
  {
    keys: 'g t',
    label: 'Tenants',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/tenants'),
  },
  {
    keys: 'g p',
    label: 'Plans',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/plans'),
  },
  {
    keys: 'g l',
    label: 'Audit Log',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/audit'),
  },
  {
    keys: 'g v',
    label: 'Web Vitals',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/web-vitals'),
  },

  {
    keys: '?',
    label: 'Kısayolları göster',
    scope: 'global',
    group: 'overlay',
    handler: ({ openOverlay }) => openOverlay(),
  },
  {
    keys: 'shift+/',
    label: 'Kısayolları göster',
    scope: 'global',
    group: 'overlay',
    handler: ({ openOverlay }) => openOverlay(),
  },
  {
    keys: 'Escape',
    label: 'Kısayol panelini kapat',
    scope: 'global',
    group: 'overlay',
    handler: ({ closeOverlay }) => closeOverlay(),
  },
  {
    keys: 'mod+/',
    label: 'Komut paleti',
    scope: 'global',
    group: 'palette',
    handler: ({ openCommandPalette }) => openCommandPalette(),
  },
]

export function findShortcut(keys: string): Shortcut | undefined {
  return SHORTCUTS.find((s) => s.keys === keys)
}

export function groupShortcuts(
  shortcuts: ReadonlyArray<Shortcut> = SHORTCUTS,
): Record<Shortcut['group'], Shortcut[]> {
  const out: Record<Shortcut['group'], Shortcut[]> = {
    navigation: [],
    overlay: [],
    general: [],
    palette: [],
  }
  for (const s of shortcuts) out[s.group].push(s)
  return out
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName.toUpperCase()
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}
