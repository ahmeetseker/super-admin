// Wave F12.A — platform-sessions.ts
// Conversation session entries seeded deterministically (FNV-1a) over the last 30 days.
// Used by /ops/sessions route, components in components/sessions/.
// SSR-safe; storage key `arsam.platform-sessions.v1` reserved for future write-back.

import { TENANTS } from '@landx/data'

export const SESSIONS_STORAGE_KEY = 'arsam.platform-sessions.v1'

export type PlatformSessionStatus = 'active' | 'expired' | 'revoked'
export type PlatformActorType = 'user' | 'service' | 'agent'

export interface PlatformSession {
  id: string
  actorId: string
  actorName: string
  actorType: PlatformActorType
  tenantId: string
  status: PlatformSessionStatus
  startedAt: number
  endedAt: number | null
  actionCount: number
}

export interface SessionAction {
  ts: number
  kind: string
  target: string
}

const SESSION_COUNT = 150

const ACTOR_TYPES: readonly PlatformActorType[] = ['user', 'service', 'agent'] as const
const STATUSES: readonly PlatformSessionStatus[] = ['active', 'expired', 'revoked'] as const

const ACTION_KINDS = [
  'view',
  'create',
  'update',
  'delete',
  'export',
  'invite',
  'rotate-key',
  'ai-invoke',
  'crm-update',
  'webhook-dispatch',
] as const

const ACTION_TARGETS = [
  'listing',
  'lead',
  'tenant',
  'plan',
  'plugin',
  'session',
  'prompt',
  'vector-collection',
  'audit-entry',
  'webhook-endpoint',
] as const

const ACTOR_FIRSTNAMES = [
  'Ahmet',
  'Selin',
  'Emre',
  'Burcu',
  'Mert',
  'Ayşe',
  'Cem',
  'Defne',
  'Onur',
  'Zeynep',
] as const

const ACTOR_LASTNAMES = ['Yıldız', 'Kaya', 'Demir', 'Çelik', 'Aydın', 'Şahin', 'Arslan'] as const

// ─── Deterministic hash (FNV-1a 32-bit) ──────────────────────────────────────

function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0
  }
  return hash >>> 0
}

function pickFloat(seed: string, min: number, max: number): number {
  const h = fnv1a(seed)
  return min + ((h % 100_000) / 100_000) * (max - min)
}

function pickInt(seed: string, min: number, max: number): number {
  return Math.floor(pickFloat(seed, min, max + 1))
}

function pickFrom<T>(seed: string, list: readonly T[]): T {
  const h = fnv1a(seed)
  return list[h % list.length]
}

// ─── Seed ────────────────────────────────────────────────────────────────────

let seedCache: PlatformSession[] | null = null

export function seedPlatformSessions(): PlatformSession[] {
  if (seedCache) return seedCache
  // Anchor to wall-clock "now" at first call so the 30-day window stays
  // current. Bucket + minute hashing remain deterministic per id.
  const nowMs = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000
  const sessions: PlatformSession[] = []
  for (let i = 0; i < SESSION_COUNT; i++) {
    const id = `sess-${String(i).padStart(4, '0')}`
    const dayBucket = pickInt(`${id}:day`, 0, 29)
    const minuteOfDay = pickInt(`${id}:min`, 0, 24 * 60 - 1)
    // Result in [nowMs - 30d, nowMs] inclusive.
    const startedAt = nowMs - dayBucket * DAY_MS - (DAY_MS - minuteOfDay * 60_000)

    const actorType = pickFrom(`${id}:type:${dayBucket}`, ACTOR_TYPES)
    const tenantId = pickFrom(`${id}:tenant:${dayBucket}`, TENANTS).id

    let status: PlatformSessionStatus
    let endedAt: number | null
    // Bias: ~25% active (recent), ~60% expired, ~15% revoked
    const statusRoll = pickInt(`${id}:status`, 0, 99)
    if (statusRoll < 25 && dayBucket < 2) {
      status = 'active'
      endedAt = null
    } else if (statusRoll < 85) {
      status = 'expired'
      const durationMin = pickInt(`${id}:dur`, 5, 300)
      endedAt = startedAt + durationMin * 60_000
    } else {
      status = 'revoked'
      const durationMin = pickInt(`${id}:dur:rev`, 1, 60)
      endedAt = startedAt + durationMin * 60_000
    }

    const actionCount = pickInt(`${id}:actions`, 1, 80)

    let actorName: string
    let actorId: string
    if (actorType === 'user') {
      const first = pickFrom(`${id}:fn`, ACTOR_FIRSTNAMES)
      const last = pickFrom(`${id}:ln`, ACTOR_LASTNAMES)
      actorName = `${first} ${last}`
      actorId = `u-${String(pickInt(`${id}:uid`, 1, 9999)).padStart(4, '0')}`
    } else if (actorType === 'service') {
      actorName = pickFrom(`${id}:svc`, [
        'sync-worker',
        'crm-importer',
        'webhook-dispatcher',
        'export-engine',
        'audit-logger',
      ])
      actorId = `svc-${actorName}`
    } else {
      actorName = pickFrom(`${id}:ag`, [
        'atolye-assistant',
        'sales-coach',
        'crm-coach',
        'prompt-tester',
      ])
      actorId = `agent-${actorName}`
    }

    sessions.push({
      id,
      actorId,
      actorName,
      actorType,
      tenantId,
      status,
      startedAt,
      endedAt,
      actionCount,
    })
  }
  sessions.sort((a, b) => b.startedAt - a.startedAt)
  seedCache = sessions
  return sessions
}

export function getPlatformSessions(): PlatformSession[] {
  return seedPlatformSessions()
}

// ─── Action log (lazy, deterministic per session) ────────────────────────────

const actionLogCache = new Map<string, SessionAction[]>()

export function getSessionActions(session: PlatformSession): SessionAction[] {
  const cached = actionLogCache.get(session.id)
  if (cached) return cached
  const span = (session.endedAt ?? Date.now()) - session.startedAt
  const count = Math.max(1, Math.min(session.actionCount, 30))
  const actions: SessionAction[] = []
  for (let i = 0; i < count; i++) {
    const seed = `${session.id}:act:${i}`
    const offset = Math.floor((i / count) * span) + pickInt(`${seed}:jitter`, 0, 60_000)
    const ts = session.startedAt + offset
    const kind = pickFrom(`${seed}:kind`, ACTION_KINDS)
    const target = pickFrom(`${seed}:target`, ACTION_TARGETS)
    actions.push({ ts, kind, target })
  }
  actions.sort((a, b) => a.ts - b.ts)
  actionLogCache.set(session.id, actions)
  return actions
}

// ─── KPIs / aggregations ─────────────────────────────────────────────────────

export interface SessionKpis {
  totalSessions: number
  activeNow: number
  expiredCount: number
  revokedCount: number
  avgDurationMs: number
  totalActions: number
}

export function computeSessionKpis(sessions: readonly PlatformSession[]): SessionKpis {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      activeNow: 0,
      expiredCount: 0,
      revokedCount: 0,
      avgDurationMs: 0,
      totalActions: 0,
    }
  }
  let activeNow = 0
  let expiredCount = 0
  let revokedCount = 0
  let durSum = 0
  let durCount = 0
  let totalActions = 0
  for (const s of sessions) {
    if (s.status === 'active') activeNow += 1
    else if (s.status === 'expired') expiredCount += 1
    else revokedCount += 1
    totalActions += s.actionCount
    if (s.endedAt) {
      durSum += s.endedAt - s.startedAt
      durCount += 1
    }
  }
  return {
    totalSessions: sessions.length,
    activeNow,
    expiredCount,
    revokedCount,
    avgDurationMs: durCount > 0 ? Math.round(durSum / durCount) : 0,
    totalActions,
  }
}

export interface StatusSlice {
  status: PlatformSessionStatus
  count: number
  share: number
}

export function statusBreakdown(sessions: readonly PlatformSession[]): StatusSlice[] {
  const counts: Record<PlatformSessionStatus, number> = { active: 0, expired: 0, revoked: 0 }
  for (const s of sessions) counts[s.status] += 1
  const total = sessions.length || 1
  return STATUSES.map((status) => ({
    status,
    count: counts[status],
    share: counts[status] / total,
  }))
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<PlatformSessionStatus, string> = {
  active: 'Aktif',
  expired: 'Süresi dolmuş',
  revoked: 'İptal edildi',
}

export const ACTOR_TYPE_LABEL: Record<PlatformActorType, string> = {
  user: 'Kullanıcı',
  service: 'Servis',
  agent: 'Ajan',
}

/** Test-only: reset the seed cache. */
export function resetPlatformSessionsForTests(): void {
  seedCache = null
  actionLogCache.clear()
}
