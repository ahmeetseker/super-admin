// Wave F11.C — Platform webhooks (super-admin /ops/webhooks).
// localStorage-backed CRUD with first-load migration from @landx/data
// WEBHOOK_ENDPOINTS / WEBHOOK_DELIVERIES seed.
//
// Schema is INDEPENDENT of @landx/data shape (newer 9-event vocabulary,
// 32-char hex secret, simplified status taxonomy). Tenant-detail page and
// the legacy WebhookTestModal keep using @landx/data directly.

import {
  WEBHOOK_ENDPOINTS as SEED_ENDPOINTS,
  WEBHOOK_DELIVERIES as SEED_DELIVERIES,
} from '@landx/data'

// ───────────────────────────────────────────────────────────────────────────
// Types

export type WebhookEvent =
  | 'listing.created'
  | 'listing.updated'
  | 'listing.deleted'
  | 'tenant.created'
  | 'tenant.suspended'
  | 'user.created'
  | 'user.deleted'
  | 'compliance.alert'
  | 'audit.action'

export const WEBHOOK_EVENTS: readonly WebhookEvent[] = [
  'listing.created',
  'listing.updated',
  'listing.deleted',
  'tenant.created',
  'tenant.suspended',
  'user.created',
  'user.deleted',
  'compliance.alert',
  'audit.action',
] as const

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  'listing.created': 'İlan oluşturuldu',
  'listing.updated': 'İlan güncellendi',
  'listing.deleted': 'İlan silindi',
  'tenant.created': 'Yeni ofis kaydı',
  'tenant.suspended': 'Ofis askıya alındı',
  'user.created': 'Yeni kullanıcı',
  'user.deleted': 'Kullanıcı silindi',
  'compliance.alert': 'Uyum uyarısı',
  'audit.action': 'Denetim olayı',
}

export const WEBHOOK_EVENT_DESCRIPTIONS: Record<WebhookEvent, string> = {
  'listing.created': 'Yeni ilan yayına girdiğinde tetiklenir.',
  'listing.updated': 'İlan alanları (fiyat, başlık, durum) değiştirildiğinde.',
  'listing.deleted': 'İlan sahibi veya admin tarafından silindiğinde.',
  'tenant.created': 'Yeni ofis platforma katıldığında.',
  'tenant.suspended': 'Ofis askıya alındığında (manuel veya otomatik).',
  'user.created': 'Yeni kullanıcı bir ofise eklendiğinde.',
  'user.deleted': 'Kullanıcı silindiğinde veya pasifleştirildiğinde.',
  'compliance.alert': 'Yüksek risk uyumluluk olayı tespit edildiğinde.',
  'audit.action': 'Denetim defterine yeni kayıt eklendiğinde.',
}

export type WebhookEndpointStatus = 'active' | 'paused' | 'failing'

export interface WebhookEndpoint {
  id: string
  url: string
  events: WebhookEvent[]
  secret: string // 32-char hex
  status: WebhookEndpointStatus
  description?: string
  createdAt: number
  lastDeliveryAt?: number
  failureCount: number
}

export interface WebhookDelivery {
  id: string
  endpointId: string
  event: WebhookEvent
  statusCode: number
  attemptedAt: number
  responseTimeMs: number
  retry: boolean
}

export interface WebhookEndpointInput {
  url: string
  events: WebhookEvent[]
  description?: string
  secret?: string // optional override; if omitted, generateSecret()
}

// ───────────────────────────────────────────────────────────────────────────
// Storage

const STORAGE_KEY = 'arsam.platform-webhooks.v1'
const CHANGE_EVENT = 'arsam-platform-webhooks:change'

interface StoreShape {
  endpoints: WebhookEndpoint[]
  /** Map endpointId → deliveries (newest first). */
  deliveries: Record<string, WebhookDelivery[]>
}

// ───────────────────────────────────────────────────────────────────────────
// Seed migration (@landx/data → platform-webhooks.v1)

function legacyEventToNew(ev: string): WebhookEvent | null {
  // Map old (@landx/data) event names to the new 9-event vocabulary.
  switch (ev) {
    case 'listing.created':
      return 'listing.created'
    case 'listing.updated':
      return 'listing.updated'
    case 'listing.published':
      // map "published" to "updated" — closest semantic match.
      return 'listing.updated'
    case 'listing.deleted':
      return 'listing.deleted'
    case 'customer.created':
      return 'user.created'
    case 'customer.stage_changed':
      return 'audit.action'
    case 'deal.created':
    case 'deal.won':
    case 'deal.lost':
      return 'audit.action'
    case 'transaction.captured':
    case 'transaction.failed':
      return 'audit.action'
    case 'audit.high_risk':
      return 'compliance.alert'
    default:
      return null
  }
}

function mapLegacyStatus(s: 'active' | 'paused' | 'failing'): WebhookEndpointStatus {
  return s
}

function migrateSeed(): StoreShape {
  const endpoints: WebhookEndpoint[] = SEED_ENDPOINTS.map((e) => {
    const events = Array.from(
      new Set(
        e.events
          .map(legacyEventToNew)
          .filter((x): x is WebhookEvent => x !== null),
      ),
    )
    return {
      id: e.id,
      url: e.url,
      events: events.length > 0 ? events : ['listing.created'],
      // Build a deterministic, valid 32-char hex secret from the legacy hint
      // so existing endpoints keep a stable secret on first load.
      secret: deriveSecretFromSeed(e.id, e.secretHint),
      status: mapLegacyStatus(e.status),
      description: undefined,
      createdAt: Date.parse(e.createdISO) || Date.now(),
      lastDeliveryAt: e.lastDeliveryISO ? Date.parse(e.lastDeliveryISO) : undefined,
      failureCount: e.failureCount30d ?? 0,
    }
  })

  const deliveries: Record<string, WebhookDelivery[]> = {}
  for (const ep of endpoints) {
    deliveries[ep.id] = generateDeliveriesForEndpoint(ep)
  }

  // If the legacy seed shipped explicit deliveries, mirror them into the
  // newest-first list of their endpoint (best effort).
  for (const d of SEED_DELIVERIES) {
    const mappedEvent = legacyEventToNew(d.event) ?? 'audit.action'
    const list = deliveries[d.webhookId]
    if (!list) continue
    // Replace the first entry with a higher-fidelity legacy attempt.
    list[0] = {
      id: d.id,
      endpointId: d.webhookId,
      event: mappedEvent,
      statusCode: d.httpStatus ?? 0,
      attemptedAt: Date.parse(d.atISO) || Date.now(),
      responseTimeMs: d.durationMs,
      retry: d.attempts > 1,
    }
  }

  return { endpoints, deliveries }
}

function deriveSecretFromSeed(id: string, hint: string): string {
  // Hint looks like "··· 4f2a"; pull trailing 4 hex chars if any.
  const tail = hint.match(/[0-9a-f]{4}/i)?.[0]?.toLowerCase() ?? '0000'
  // Pad to 32 hex chars with a deterministic prefix derived from the id.
  const seedFromId = hashString(id).toString(16).padStart(8, '0')
  const base = (seedFromId + seedFromId + seedFromId + tail).slice(0, 32)
  return base.padEnd(32, '0').slice(0, 32)
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

// Deterministic delivery generator — 30 attempts per endpoint, newest first.
function generateDeliveriesForEndpoint(ep: WebhookEndpoint): WebhookDelivery[] {
  const baseSeed = hashString(ep.id)
  const out: WebhookDelivery[] = []
  const now = ep.lastDeliveryAt ?? Date.now()
  for (let i = 0; i < 30; i++) {
    const s1 = mulberry32(baseSeed + i * 1009)
    const r1 = s1()
    const r2 = s1()
    const r3 = s1()
    const eventIdx = Math.floor(r1 * Math.max(1, ep.events.length))
    const event = ep.events[Math.min(eventIdx, ep.events.length - 1)] ?? 'listing.created'
    // Status distribution: roughly mirror endpoint health.
    let statusCode: number
    if (ep.status === 'failing') {
      statusCode = r2 < 0.4 ? 200 : r2 < 0.7 ? 502 : r2 < 0.85 ? 500 : 429
    } else if (ep.status === 'paused') {
      statusCode = r2 < 0.95 ? 200 : 408
    } else {
      statusCode = r2 < 0.92 ? 200 : r2 < 0.96 ? 201 : r2 < 0.98 ? 429 : 502
    }
    const retry = statusCode >= 500 || (statusCode === 429 && r3 < 0.6)
    out.push({
      id: `dlv_${ep.id}_${i.toString(36)}`,
      endpointId: ep.id,
      event,
      statusCode,
      attemptedAt: now - i * (5 * 60 * 1000 + Math.floor(r3 * 60_000)), // ~5min spacing
      responseTimeMs: Math.round(60 + r1 * 480 + (statusCode >= 500 ? r2 * 6000 : 0)),
      retry,
    })
  }
  return out
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Storage helpers

function read(): StoreShape {
  if (typeof window === 'undefined') {
    return migrateSeed()
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = migrateSeed()
      write(seeded)
      return seeded
    }
    const parsed = JSON.parse(raw) as StoreShape
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.endpoints) ||
      !parsed.deliveries ||
      typeof parsed.deliveries !== 'object'
    ) {
      const seeded = migrateSeed()
      write(seeded)
      return seeded
    }
    // De-dupe endpoint ids defensively (last-write-wins).
    const seen = new Map<string, WebhookEndpoint>()
    for (const ep of parsed.endpoints) {
      if (ep && typeof ep.id === 'string') seen.set(ep.id, ep)
    }
    return {
      endpoints: Array.from(seen.values()),
      deliveries: parsed.deliveries,
    }
  } catch {
    return migrateSeed()
  }
}

function write(next: StoreShape): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    /* quota / privacy mode — swallow */
  }
}

// Internal helper for tests + first-load to nuke storage and reseed.
export function _resetForTests(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Public API

export function getEndpoints(): WebhookEndpoint[] {
  return read().endpoints
}

export function getEndpoint(id: string): WebhookEndpoint | null {
  return read().endpoints.find((e) => e.id === id) ?? null
}

export function createEndpoint(input: WebhookEndpointInput): WebhookEndpoint {
  const store = read()
  const endpoint: WebhookEndpoint = {
    id: makeEndpointId(),
    url: input.url.trim(),
    events: dedupeEvents(input.events),
    secret: input.secret && /^[0-9a-f]{32}$/i.test(input.secret) ? input.secret.toLowerCase() : generateSecret(),
    status: 'active',
    description: input.description?.trim() || undefined,
    createdAt: Date.now(),
    failureCount: 0,
  }
  store.endpoints = [...store.endpoints, endpoint]
  store.deliveries[endpoint.id] = generateDeliveriesForEndpoint(endpoint)
  write(store)
  return endpoint
}

export function updateEndpoint(
  id: string,
  patch: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'description' | 'status' | 'secret'>>,
): WebhookEndpoint | null {
  const store = read()
  const idx = store.endpoints.findIndex((e) => e.id === id)
  if (idx === -1) return null
  const current = store.endpoints[idx]
  const next: WebhookEndpoint = {
    ...current,
    ...patch,
    events: patch.events ? dedupeEvents(patch.events) : current.events,
    url: patch.url !== undefined ? patch.url.trim() : current.url,
    description:
      patch.description !== undefined
        ? patch.description.trim() || undefined
        : current.description,
  }
  store.endpoints = [...store.endpoints.slice(0, idx), next, ...store.endpoints.slice(idx + 1)]
  // If events changed, regenerate deliveries so the history matches.
  if (patch.events) {
    store.deliveries[id] = generateDeliveriesForEndpoint(next)
  }
  write(store)
  return next
}

export function deleteEndpoint(id: string): boolean {
  const store = read()
  const before = store.endpoints.length
  store.endpoints = store.endpoints.filter((e) => e.id !== id)
  delete store.deliveries[id]
  if (store.endpoints.length === before) return false
  write(store)
  return true
}

export function pauseEndpoint(id: string): WebhookEndpoint | null {
  return updateEndpoint(id, { status: 'paused' })
}

export function resumeEndpoint(id: string): WebhookEndpoint | null {
  return updateEndpoint(id, { status: 'active' })
}

export function rotateSecret(id: string): WebhookEndpoint | null {
  return updateEndpoint(id, { secret: generateSecret() })
}

export function getDeliveries(endpointId: string): WebhookDelivery[] {
  const store = read()
  return store.deliveries[endpointId] ?? []
}

export function getLastDelivery(endpointId: string): WebhookDelivery | null {
  const list = getDeliveries(endpointId)
  return list[0] ?? null
}

export function getEndpointTotals(): {
  total: number
  active: number
  paused: number
  failing: number
} {
  const endpoints = getEndpoints()
  let active = 0
  let paused = 0
  let failing = 0
  for (const e of endpoints) {
    if (e.status === 'active') active++
    else if (e.status === 'paused') paused++
    else if (e.status === 'failing') failing++
  }
  return { total: endpoints.length, active, paused, failing }
}

export function subscribePlatformWebhooks(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => cb()
  window.addEventListener(CHANGE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Utilities

export function generateSecret(): string {
  // 16 bytes → 32-char lowercase hex.
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Deterministic fallback (should not hit in browser/jsdom).
  let out = ''
  for (let i = 0; i < 32; i++) {
    out += Math.floor(Math.random() * 16).toString(16)
  }
  return out
}

export function isValidWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.length > 0
  } catch {
    return false
  }
}

function dedupeEvents(events: WebhookEvent[]): WebhookEvent[] {
  return Array.from(new Set(events))
}

function makeEndpointId(): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `whk-${rnd}`
}

export function statusCodeTone(code: number): 'success' | 'warn' | 'error' | 'neutral' {
  if (code >= 200 && code < 300) return 'success'
  if (code >= 400 && code < 500) return 'warn'
  if (code >= 500) return 'error'
  return 'neutral'
}

export const STORAGE_KEY_FOR_TESTS = STORAGE_KEY
