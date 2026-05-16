// Wave F12.D — super-admin platform memory layer.
// Deterministic mock: 250 entries over 90d, three types, three scopes,
// 8-agent pool, hit rate computed. No localStorage — pure compute from seed.

import { inRange, type TimeRange } from './super-admin-time-range'

export type MemoryEntryType = 'long-term' | 'working' | 'episodic'
export type MemoryEntryScope = 'tenant' | 'agent' | 'global'

export interface MemoryEntry {
  id: string
  type: MemoryEntryType
  scope: MemoryEntryScope
  agentId: string
  tenantId: string | null
  content: string
  createdAt: number // ms epoch
  accessCount: number
  ageDays: number
  lastAccessedAt: number
}

export interface MemoryStats {
  totalEntries: number
  byType: Record<MemoryEntryType, number>
  byScope: Record<MemoryEntryScope, number>
  byAgent: Record<string, number>
  avgAccessCount: number
  totalHits: number
  hitRate: number // totalHits / totalEntries (mock)
}

// Stable epoch for deterministic seed. 2026-05-13 00:00:00 UTC.
const SEED_NOW = 1778630400000
const DAY_MS = 86_400_000
const SEED_COUNT = 250

export const AGENT_POOL: string[] = [
  'atolye-assistant',
  'sales-coach',
  'tapu-takip',
  'crm-pipeline',
  'kvkk-vault',
  'listing-analytics',
  'translation-tr',
  'pdf-generator',
]

const TENANT_POOL: (string | null)[] = ['t-001', 't-002', 't-003', 't-004', 't-005', null, null]

// ─── Deterministic PRNG ──────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CONTENT_SAMPLES = [
  'Kullanıcı 3+1 daireleri tercih ediyor, Kadıköy ve Üsküdar bölgelerinde arıyor.',
  'Maksimum bütçe 4.5M TL, kredi kullanmayı düşünmüyor, peşin ödeme yapacak.',
  'Geçen ay 3 ilan görüntülendi: ilan-1024, ilan-1158, ilan-1240. Hepsi deniz manzarası.',
  'Müşteri sözleşme öncesi tapu durum sorgusu istedi, ekspertiz raporu paylaşıldı.',
  'Pipeline aşaması: teklif aşamasında, son etkileşim 2 hafta önce, follow-up gerekiyor.',
  'KVKK açık rıza beyan tarihi: 2026-01-15, retention 730 gün — Q4 expire olacak.',
  'A/B test sonucu: yeni galeri tasarımı dönüşümü %12 artırdı, calistay önerildi.',
  'Sales coach: müşteri itirazlarına 3 farklı yaklaşım önerdi — duygusal, mantıksal, sosyal kanıt.',
  'Atölye asistan: kullanıcının 5 ortak özelliği — bahçe, otopark, eşyalı, asansör, doğalgaz.',
  'Tapu takip: randevu Pazartesi 14:00, harç 18.500 TL hesaplandı, banka kanalı tamamlandı.',
  'CRM pipeline: 8 fırsat aktif, 3\'ü hot lead, 2\'si stalled — manager müdahalesi öneriliyor.',
  'Çeviri asistanı: 5 ilan İngilizce\'ye çevrildi, 2 Almanca, 1 Rusça — yabancı talep artışı tespit edildi.',
  'PDF üretici: 12 sözleşme oluşturuldu bu hafta, ortalama imza süresi 2.3 gün.',
  'Heatmap analizi: galeri 4. fotoğraf en çok tıklanan, üst menüde "iletişim" butonu az tıklanıyor.',
  'Helpdesk FAQ: en sık sorulan ilk 5 soru — komisyon, kapora, ipotek, ekspertiz, harç.',
  'Müşteri profil: emekli mühendis, 2 çocuklu, sahil kasabası emekliliği planlıyor, deniz ön planda.',
  'Listing analytics: ilan-3204 son 7 günde 450 görüntülenme, en yüksek 18-25 yaş.',
  'Audit log: tenant-2 admin permission değişikliği — kvkk-vault tarafından flag\'lendi.',
  'Geçici ses notu: "Kadıköy Moda\'da arıyoruz, en az 130m2, asansörlü olmasın." — transkripsiyon.',
  'Episodic anı: Mart 2026 görüşmesinde müşteri bahçeli ev istemediğini açıkça belirtti.',
]

// ─── Seed generator ──────────────────────────────────────────────────────────

let cache: MemoryEntry[] | null = null

function makeEntries(): MemoryEntry[] {
  const rng = mulberry32(42)
  const entries: MemoryEntry[] = []

  for (let i = 0; i < SEED_COUNT; i++) {
    // Type distribution: 40% long-term, 35% working, 25% episodic.
    const tRoll = rng()
    let type: MemoryEntryType
    if (tRoll < 0.4) type = 'long-term'
    else if (tRoll < 0.75) type = 'working'
    else type = 'episodic'

    // Scope distribution: roughly even — 40 tenant, 40 agent, 20 global.
    const sRoll = rng()
    let scope: MemoryEntryScope
    if (sRoll < 0.4) scope = 'tenant'
    else if (sRoll < 0.8) scope = 'agent'
    else scope = 'global'

    const agentIdx = Math.floor(rng() * AGENT_POOL.length)
    const tenantIdx = Math.floor(rng() * TENANT_POOL.length)
    const contentIdx = Math.floor(rng() * CONTENT_SAMPLES.length)

    const ageDays = Math.floor(rng() * 90) // 0..89
    const createdAt = SEED_NOW - ageDays * DAY_MS - Math.floor(rng() * DAY_MS)

    // Access count distribution: most entries low access, a few hotspots.
    const accessRoll = rng()
    const accessCount = accessRoll < 0.7
      ? Math.floor(rng() * 20)
      : Math.floor(20 + rng() * 80)

    const lastAccessedAt = accessCount === 0
      ? createdAt
      : createdAt + Math.floor(rng() * (SEED_NOW - createdAt))

    entries.push({
      id: `mem-${String(i + 1).padStart(4, '0')}`,
      type,
      scope,
      agentId: AGENT_POOL[agentIdx],
      tenantId: scope === 'global' ? null : TENANT_POOL[tenantIdx],
      content: CONTENT_SAMPLES[contentIdx],
      createdAt,
      accessCount,
      ageDays,
      lastAccessedAt,
    })
  }

  // Sort newest first for stable ordering in lists.
  entries.sort((a, b) => b.createdAt - a.createdAt)
  return entries
}

export function getMemoryEntries(): MemoryEntry[] {
  if (!cache) cache = makeEntries()
  return cache
}

/** Test-only: drop the cached seed. */
export function resetMemoryForTests(): void {
  cache = null
}

// ─── Filtering ───────────────────────────────────────────────────────────────

export interface MemoryFilter {
  range?: TimeRange
  type?: MemoryEntryType | 'all'
  scope?: MemoryEntryScope | 'all'
  agentId?: string | 'all'
}

export function filterEntries(entries: MemoryEntry[], filter: MemoryFilter): MemoryEntry[] {
  return entries.filter((e) => {
    if (filter.range && !inRange(e.createdAt, filter.range)) return false
    if (filter.type && filter.type !== 'all' && e.type !== filter.type) return false
    if (filter.scope && filter.scope !== 'all' && e.scope !== filter.scope) return false
    if (filter.agentId && filter.agentId !== 'all' && e.agentId !== filter.agentId) return false
    return true
  })
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function computeStats(entries: MemoryEntry[]): MemoryStats {
  const byType: Record<MemoryEntryType, number> = { 'long-term': 0, 'working': 0, 'episodic': 0 }
  const byScope: Record<MemoryEntryScope, number> = { tenant: 0, agent: 0, global: 0 }
  const byAgent: Record<string, number> = {}
  let totalAccess = 0

  for (const e of entries) {
    byType[e.type]++
    byScope[e.scope]++
    byAgent[e.agentId] = (byAgent[e.agentId] ?? 0) + 1
    totalAccess += e.accessCount
  }

  const totalEntries = entries.length
  const avgAccessCount = totalEntries === 0 ? 0 : totalAccess / totalEntries
  // Mock hit rate: treat accessCount > 0 entries as "hits"; total hits = sum of access events.
  const totalHits = totalAccess
  // hitRate = totalHits / (totalEntries * 10) — capped to 1.0. Mock-style.
  const hitRate = totalEntries === 0 ? 0 : Math.min(1, totalHits / (totalEntries * 10))

  return {
    totalEntries,
    byType,
    byScope,
    byAgent,
    avgAccessCount,
    totalHits,
    hitRate,
  }
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export const TYPE_LABEL: Record<MemoryEntryType, string> = {
  'long-term': 'Uzun süreli',
  'working': 'Çalışma',
  'episodic': 'Episodik',
}

export const SCOPE_LABEL: Record<MemoryEntryScope, string> = {
  tenant: 'Tenant',
  agent: 'Agent',
  global: 'Global',
}
