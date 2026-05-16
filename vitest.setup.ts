// Wave F13.E — shared vitest setup. Replaces the in-memory localStorage shim
// previously copy-pasted across every platform-*.test.ts. jsdom 29 ships a
// non-functional localStorage; we install a fresh InMemoryStorage instance
// before each test and unstub afterwards so suites stay isolated.

import '@testing-library/jest-dom/vitest'
import { beforeEach, afterEach, vi } from 'vitest'

class InMemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
}

beforeEach(() => {
  const local = new InMemoryStorage()
  const session = new InMemoryStorage()
  vi.stubGlobal('localStorage', local)
  vi.stubGlobal('sessionStorage', session)
  if (typeof globalThis.window !== 'undefined') {
    Object.defineProperty(globalThis.window, 'localStorage', {
      value: local,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(globalThis.window, 'sessionStorage', {
      value: session,
      configurable: true,
      writable: true,
    })
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})
