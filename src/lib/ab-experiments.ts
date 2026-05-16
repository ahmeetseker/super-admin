/**
 * Wave F26.0 — A/B experiment store (mock).
 *
 * Variant selection is deterministic per (experimentKey, userId) pair via
 * a string hash; weight-driven allocation lets operators run unbalanced
 * splits without re-rolling users between deploys.
 */

export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'paused'

export interface Variant {
  id: string
  key: string
  name: string
  weight: number          // 0-100; sum of variant weights = 100
  conversions?: number    // mock cumulative
  exposures?: number
}

export interface Experiment {
  id: string
  key: string
  name: string
  description?: string
  status: ExperimentStatus
  variants: Variant[]
  startISO: string
  endISO?: string
  tags: string[]
}

export const AB_EXPERIMENTS_STORAGE_KEY = 'arsam.platform-ab-experiments.v1'

const SEED: Experiment[] = [
  {
    id: 'exp_seed_hero',
    key: 'home-hero-headline',
    name: 'Anasayfa hero başlık varyantları',
    description: 'Arsa portföyü vs Arsa keşfedin vs Yatırım için arsa',
    status: 'running',
    variants: [
      { id: 'v_a', key: 'control', name: 'Arsa portföyünüz', weight: 50, exposures: 1240, conversions: 64 },
      { id: 'v_b', key: 'discover', name: 'Arsa keşfedin', weight: 25, exposures: 612, conversions: 41 },
      { id: 'v_c', key: 'invest', name: 'Yatırım için arsa', weight: 25, exposures: 598, conversions: 39 },
    ],
    startISO: '2026-05-01T00:00:00Z',
    tags: ['public-site', 'home'],
  },
  {
    id: 'exp_seed_compare_cta',
    key: 'compare-cta-color',
    name: 'Karşılaştır CTA — pas vs amber',
    status: 'completed',
    variants: [
      { id: 'v_p', key: 'control', name: 'Pas', weight: 50, exposures: 2104, conversions: 168 },
      { id: 'v_q', key: 'amber', name: 'Amber', weight: 50, exposures: 2098, conversions: 142 },
    ],
    startISO: '2026-04-12T00:00:00Z',
    endISO: '2026-05-08T00:00:00Z',
    tags: ['public-site', 'compare'],
  },
  {
    id: 'exp_seed_bulk_label',
    key: 'bulk-action-label',
    name: 'Bulk delete: "Sil" vs "Toplu kaldır"',
    status: 'draft',
    variants: [
      { id: 'v_s', key: 'short', name: 'Sil', weight: 50 },
      { id: 'v_l', key: 'long', name: 'Toplu kaldır', weight: 50 },
    ],
    startISO: '2026-05-20T00:00:00Z',
    tags: ['atolye-admin', 'bulk'],
  },
]

function readStore(): Experiment[] | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(AB_EXPERIMENTS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Experiment[]) : null
  } catch {
    return null
  }
}

function writeStore(items: Experiment[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(AB_EXPERIMENTS_STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export function getExperiments(): Experiment[] {
  const stored = readStore()
  if (stored !== null) return stored
  writeStore(SEED)
  return [...SEED]
}

export function getExperiment(id: string): Experiment | null {
  return getExperiments().find((e) => e.id === id) ?? null
}

export interface CreateExperimentInput {
  key: string
  name: string
  description?: string
  variants: Array<Omit<Variant, 'id' | 'exposures' | 'conversions'>>
  tags?: string[]
}

export function createExperiment(input: CreateExperimentInput): Experiment {
  const list = getExperiments()
  if (list.some((e) => e.key === input.key)) {
    throw new Error('Bu deney anahtarı zaten kayıtlı')
  }
  const totalWeight = input.variants.reduce((s, v) => s + v.weight, 0)
  if (totalWeight !== 100) {
    throw new Error(`Varyant ağırlık toplamı 100 olmalı (şu an ${totalWeight})`)
  }
  const exp: Experiment = {
    id: `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    key: input.key,
    name: input.name,
    description: input.description,
    status: 'draft',
    variants: input.variants.map((v, i) => ({
      id: `v_${i}_${Math.random().toString(36).slice(2, 6)}`,
      key: v.key,
      name: v.name,
      weight: v.weight,
      exposures: 0,
      conversions: 0,
    })),
    startISO: new Date().toISOString(),
    tags: input.tags ?? [],
  }
  list.push(exp)
  writeStore(list)
  return exp
}

export function updateExperiment(
  id: string,
  patch: Partial<Omit<Experiment, 'id'>>,
): Experiment | null {
  const list = getExperiments()
  const idx = list.findIndex((e) => e.id === id)
  if (idx < 0) return null
  list[idx] = { ...list[idx], ...patch }
  writeStore(list)
  return list[idx]
}

export function deleteExperiment(id: string): void {
  const list = getExperiments().filter((e) => e.id !== id)
  writeStore(list)
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function selectVariant(experimentKey: string, userId: string): Variant | null {
  const exp = getExperiments().find((e) => e.key === experimentKey)
  if (!exp || exp.status !== 'running') return null
  if (exp.variants.length === 0) return null
  const bucket = hash(`${experimentKey}:${userId}`) % 100
  let cursor = 0
  for (const v of exp.variants) {
    cursor += v.weight
    if (bucket < cursor) return v
  }
  return exp.variants[exp.variants.length - 1] ?? null
}

export function resetExperimentsForTests(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(AB_EXPERIMENTS_STORAGE_KEY)
}
