import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import {
  SEQUENCE_TIMEOUT_MS,
  SHORTCUTS,
  findShortcut,
  isEditableTarget,
  type Shortcut,
  type ShortcutContext,
} from '@/lib/keyboard-shortcuts'

interface Options {
  openOverlay: () => void
  closeOverlay: () => void
  openCommandPalette?: () => void
  closeCommandPalette?: () => void
}

const NOOP = () => {}

/**
 * F14.B — super-admin global keyboard listener. F16.A: modifier chord
 * resolver (mod+x / cmd+x / ctrl+x) for the command palette binding.
 * Same semantics as atolye-admin: vim `g <letter>` sequences with a 1.2 s
 * buffer, `?` / `shift+/` aliases for the overlay, no-op while typing in
 * editable elements (Escape always flows through).
 */
export function useKeyboardShortcuts({
  openOverlay,
  closeOverlay,
  openCommandPalette,
  closeCommandPalette,
}: Options) {
  const navigate = useNavigate()
  const ctxRef = useRef<ShortcutContext>({
    navigate,
    openOverlay,
    closeOverlay,
    openCommandPalette: openCommandPalette ?? NOOP,
    closeCommandPalette: closeCommandPalette ?? NOOP,
  })
  ctxRef.current = {
    navigate,
    openOverlay,
    closeOverlay,
    openCommandPalette: openCommandPalette ?? NOOP,
    closeCommandPalette: closeCommandPalette ?? NOOP,
  }

  const resolve = useCallback((keys: string): Shortcut | undefined => {
    return findShortcut(keys)
  }, [])

  useEffect(() => {
    let pending: string | null = null
    let pendingTimer: number | null = null

    const clearPending = () => {
      pending = null
      if (pendingTimer !== null) {
        window.clearTimeout(pendingTimer)
        pendingTimer = null
      }
    }

    const fire = (shortcut: Shortcut) => {
      shortcut.handler(ctxRef.current)
    }

    const handle = (e: KeyboardEvent) => {
      const isEscape = e.key === 'Escape'

      if (!isEscape && isEditableTarget(e.target)) {
        clearPending()
        return
      }

      const hasMod = e.metaKey || e.ctrlKey || e.altKey
      if (hasMod) {
        clearPending()
        const keyLower = e.key.toLowerCase()
        const isMac = e.metaKey && !e.ctrlKey
        const explicitPrefix = isMac ? 'cmd' : 'ctrl'
        const candidates = [
          `${explicitPrefix}+${keyLower}`,
          `mod+${keyLower}`,
        ]
        if (e.shiftKey) {
          candidates.unshift(`${explicitPrefix}+shift+${keyLower}`, `mod+shift+${keyLower}`)
        }
        if (e.altKey) {
          candidates.unshift(`${explicitPrefix}+alt+${keyLower}`, `mod+alt+${keyLower}`)
        }
        for (const c of candidates) {
          const match = resolve(c)
          if (match) {
            e.preventDefault()
            fire(match)
            return
          }
        }
        return
      }

      if (e.shiftKey && e.key === '/') {
        e.preventDefault()
        clearPending()
        const match = resolve('shift+/') ?? resolve('?')
        if (match) fire(match)
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        clearPending()
        const match = resolve('?')
        if (match) fire(match)
        return
      }

      if (isEscape) {
        const match = resolve('Escape')
        if (match) fire(match)
        clearPending()
        return
      }

      if (e.shiftKey) {
        clearPending()
        return
      }

      const key = e.key.toLowerCase()
      if (key.length !== 1) {
        clearPending()
        return
      }

      if (pending === 'g') {
        const combo = `g ${key}`
        const match = resolve(combo)
        clearPending()
        if (match) {
          e.preventDefault()
          fire(match)
        }
        return
      }

      if (key === 'g') {
        pending = 'g'
        pendingTimer = window.setTimeout(clearPending, SEQUENCE_TIMEOUT_MS)
        return
      }
    }

    window.addEventListener('keydown', handle)
    return () => {
      window.removeEventListener('keydown', handle)
      clearPending()
    }
  }, [resolve])

  return { shortcuts: SHORTCUTS }
}
