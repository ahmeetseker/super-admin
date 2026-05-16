// Wave F12.D — super-admin platform vector store registry.
// 6 collections deterministic seed, reindex mock (status → 2sn → active).
// localStorage-backed for reindex state persistence across navigation.

const KEY = 'arsam.platform-vector.v1'
const EVENT = 'arsam.platform-vector:change'
const REINDEX_DELAY_MS = 2000

export type CollectionStatus = 'active' | 'reindexing' | 'stale'
export type DistanceMetric = 'cosine' | 'dot' | 'l2'

export interface VectorCollection {
  id: string
  name: string
  description: string
  vectorCount: number
  dimension: number
  distanceMetric: DistanceMetric
  /** Bytes — vectorCount * dimension * 4 (float32). */
  indexSize: number
  status: CollectionStatus
  lastReindexedAt: number
  modelEmbedding: string
}

// Stable epoch: 2026-05-13 00:00:00 UTC.
const SEED_NOW = 1778630400000
const DAY_MS = 86_400_000

interface SeedConfig {
  id: string
  name: string
  description: string
  vectorCount: number
  dimension: number
  distanceMetric: DistanceMetric
  modelEmbedding: string
  daysAgoReindexed: number
  status?: CollectionStatus
}

const SEED_CONFIGS: SeedConfig[] = [
  {
    id: 'listings-embedding',
    name: 'listings-embedding',
    description: 'İlan açıklama vektörleri — semantik arama ve benzer ilan önerisi.',
    vectorCount: 50_000,
    dimension: 1536,
    distanceMetric: 'cosine',
    modelEmbedding: 'text-embedding-3-large',
    daysAgoReindexed: 2,
  },
  {
    id: 'listings-text',
    name: 'listings-text',
    description: 'İlan başlık ve kısa metin vektörleri — hızlı arama indeksi.',
    vectorCount: 100_000,
    dimension: 768,
    distanceMetric: 'cosine',
    modelEmbedding: 'bge-base-tr-v1',
    daysAgoReindexed: 1,
  },
  {
    id: 'users',
    name: 'users',
    description: 'Kullanıcı profil ve tercih vektörleri — kişiselleştirme.',
    vectorCount: 10_000,
    dimension: 1536,
    distanceMetric: 'cosine',
    modelEmbedding: 'text-embedding-3-large',
    daysAgoReindexed: 5,
  },
  {
    id: 'helpdesk-faq',
    name: 'helpdesk-faq',
    description: 'Müşteri destek SSS vektörleri — chatbot retrieval.',
    vectorCount: 5_000,
    dimension: 768,
    distanceMetric: 'cosine',
    modelEmbedding: 'bge-base-tr-v1',
    daysAgoReindexed: 14,
    status: 'stale',
  },
  {
    id: 'audits-logs',
    name: 'audits-logs',
    description: 'Audit log vektörleri — anomali tespiti ve KVKK kanıt arama.',
    vectorCount: 200_000,
    dimension: 384,
    distanceMetric: 'dot',
    modelEmbedding: 'minilm-l6-v2',
    daysAgoReindexed: 0,
  },
  {
    id: 'products',
    name: 'products',
    description: 'Ürün ve hizmet katalog vektörleri — premium ürün eşleştirme.',
    vectorCount: 500_000,
    dimension: 1024,
    distanceMetric: 'cosine',
    modelEmbedding: 'bge-large-tr-v1',
    daysAgoReindexed: 7,
  },
]

function seed(): VectorCollection[] {
  return SEED_CONFIGS.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    vectorCount: c.vectorCount,
    dimension: c.dimension,
    distanceMetric: c.distanceMetric,
    indexSize: c.vectorCount * c.dimension * 4,
    status: c.status ?? 'active',
    lastReindexedAt: SEED_NOW - c.daysAgoReindexed * DAY_MS,
    modelEmbedding: c.modelEmbedding,
  }))
}

// ─── IO ──────────────────────────────────────────────────────────────────────

let cache: VectorCollection[] | null = null

function invalidate(): void {
  cache = null
}

function read(): VectorCollection[] {
  if (cache) return cache
  if (typeof window === 'undefined') {
    cache = seed()
    return cache
  }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      const s = seed()
      write(s)
      cache = s
      return s
    }
    const parsed = JSON.parse(raw) as VectorCollection[] | null
    if (!parsed || !Array.isArray(parsed)) {
      const s = seed()
      write(s)
      cache = s
      return s
    }
    cache = parsed
    return cache
  } catch {
    cache = seed()
    return cache
  }
}

function write(next: VectorCollection[]): void {
  cache = next
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* quota / privacy mode — swallow */
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getCollections(): VectorCollection[] {
  return read()
}

export function getCollection(id: string): VectorCollection | undefined {
  return read().find((c) => c.id === id)
}

/**
 * Reindex async simulation:
 *   1. Flip status → 'reindexing' immediately.
 *   2. After REINDEX_DELAY_MS, set status='active' and update lastReindexedAt.
 *   3. Dispatch event on each transition.
 *
 * Idempotent: calling on an already-reindexing collection is a no-op.
 * Returns the updated (reindexing) collection.
 */
export function reindexCollection(id: string): VectorCollection {
  const state = read()
  const idx = state.findIndex((c) => c.id === id)
  if (idx === -1) throw new Error(`Collection not found: ${id}`)
  if (state[idx].status === 'reindexing') return state[idx]

  const reindexing: VectorCollection = { ...state[idx], status: 'reindexing' }
  const next = [...state.slice(0, idx), reindexing, ...state.slice(idx + 1)]
  write(next)

  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      const current = read()
      const cIdx = current.findIndex((c) => c.id === id)
      if (cIdx === -1) return
      const updated: VectorCollection = {
        ...current[cIdx],
        status: 'active',
        lastReindexedAt: Date.now(),
      }
      const nextState = [...current.slice(0, cIdx), updated, ...current.slice(cIdx + 1)]
      write(nextState)
    }, REINDEX_DELAY_MS)
  }

  return reindexing
}

export function subscribeCollections(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e?: Event) => {
    if (e?.type === 'storage') invalidate()
    cb()
  }
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

/** Test-only: clear store + reseed. */
export function resetVectorForTests(): void {
  invalidate()
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* sessionStorage / localStorage may be replaced by test shim */
  }
}

// ─── Aggregates ──────────────────────────────────────────────────────────────

export interface VectorStats {
  totalCollections: number
  totalVectors: number
  totalIndexSizeBytes: number
  avgDimension: number
}

export function computeVectorStats(collections: VectorCollection[]): VectorStats {
  const totalCollections = collections.length
  let totalVectors = 0
  let totalIndexSizeBytes = 0
  let dimensionSum = 0
  for (const c of collections) {
    totalVectors += c.vectorCount
    totalIndexSizeBytes += c.indexSize
    dimensionSum += c.dimension
  }
  return {
    totalCollections,
    totalVectors,
    totalIndexSizeBytes,
    avgDimension: totalCollections === 0 ? 0 : Math.round(dimensionSum / totalCollections),
  }
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<CollectionStatus, string> = {
  active: 'Aktif',
  reindexing: 'Yeniden indeksleniyor',
  stale: 'Bayatlamış',
}

export const METRIC_LABEL: Record<DistanceMetric, string> = {
  cosine: 'Cosine',
  dot: 'Dot',
  l2: 'L2',
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
