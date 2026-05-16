// sessionStorage-backed evidence file store (UI mock — no real upload).
// SSR-safe: all reads/writes guarded by typeof window/sessionStorage checks.

import type { EvidenceFile } from './evidence-types'

const KEY = 'superadmin.compliance.evidence'
const EVENT = 'compliance-evidence:change'

type StoreShape = Record<string, EvidenceFile[]>

function read(): StoreShape {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoreShape
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function write(next: StoreShape): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* quota / privacy mode — swallow */
  }
}

export function getEvidence(checkId: string): EvidenceFile[] {
  return read()[checkId] ?? []
}

export function addFiles(checkId: string, files: EvidenceFile[]): EvidenceFile[] {
  const all = read()
  const prev = all[checkId] ?? []
  const next = [...prev, ...files]
  all[checkId] = next
  write(all)
  return next
}

export function removeFile(checkId: string, fileId: string): EvidenceFile[] {
  const all = read()
  const prev = all[checkId] ?? []
  const next = prev.filter((f) => f.id !== fileId)
  all[checkId] = next
  write(all)
  return next
}

export function getCounts(): Record<string, number> {
  const all = read()
  const out: Record<string, number> = {}
  for (const k of Object.keys(all)) out[k] = all[k]?.length ?? 0
  return out
}

export interface EvidenceSummary {
  count: number
  lastAt: string | null
}

export function getSummaries(): Record<string, EvidenceSummary> {
  const all = read()
  const out: Record<string, EvidenceSummary> = {}
  for (const k of Object.keys(all)) {
    const list = all[k] ?? []
    out[k] = {
      count: list.length,
      lastAt: list.length > 0 ? list[list.length - 1].uploadedAt : null,
    }
  }
  return out
}

export function subscribeEvidence(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => cb()
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
