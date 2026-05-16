/**
 * Wave F26.0 — Feature flag store (mock).
 *
 * Until GrowthBook/Unleash lands, operators manage flags via this localStorage
 * driver. `isFeatureEnabled` reads the flag + applies rollout percentage to
 * a stable user hash so the same caller gets the same answer across reloads.
 */

export type FlagEnvironment = 'development' | 'preview' | 'production'

export interface FeatureFlag {
  id: string
  key: string
  name: string
  description?: string
  enabled: boolean
  rolloutPct: number          // 0-100
  environments: FlagEnvironment[]
  tags: string[]
  createdISO: string
  modifiedISO: string
}

export const FEATURE_FLAGS_STORAGE_KEY = 'arsam.platform-feature-flags.v1'

const SEED: FeatureFlag[] = [
  {
    id: 'ff_seed_palette_v2',
    key: 'command-palette-v2',
    name: 'Komut paleti v2',
    description: 'Yeni cmd+/ paleti (F15/F16/F24)',
    enabled: true,
    rolloutPct: 100,
    environments: ['development', 'preview', 'production'],
    tags: ['ui'],
    createdISO: '2026-04-10T00:00:00Z',
    modifiedISO: '2026-05-10T00:00:00Z',
  },
  {
    id: 'ff_seed_virtual_tour',
    key: 'virtual-tour-pannellum',
    name: '360° sanal tur (Pannellum)',
    enabled: true,
    rolloutPct: 25,
    environments: ['preview', 'production'],
    tags: ['public-site', 'listing'],
    createdISO: '2026-05-01T00:00:00Z',
    modifiedISO: '2026-05-13T00:00:00Z',
  },
  {
    id: 'ff_seed_dark_mode',
    key: 'dark-mode',
    name: 'Karanlık tema',
    enabled: true,
    rolloutPct: 100,
    environments: ['development', 'preview', 'production'],
    tags: ['ui', 'theme'],
    createdISO: '2026-03-22T00:00:00Z',
    modifiedISO: '2026-04-02T00:00:00Z',
  },
  {
    id: 'ff_seed_csv_import',
    key: 'csv-import-wizard',
    name: 'CSV import sihirbazı',
    enabled: true,
    rolloutPct: 100,
    environments: ['development', 'preview', 'production'],
    tags: ['atolye-admin', 'bulk'],
    createdISO: '2026-04-25T00:00:00Z',
    modifiedISO: '2026-04-25T00:00:00Z',
  },
  {
    id: 'ff_seed_realtime',
    key: 'realtime-messaging',
    name: 'Gerçek zamanlı mesajlaşma',
    description: 'Backend bağımlı; UI mock hazır',
    enabled: false,
    rolloutPct: 0,
    environments: [],
    tags: ['atolye-admin', 'backend-bound'],
    createdISO: '2026-05-01T00:00:00Z',
    modifiedISO: '2026-05-14T00:00:00Z',
  },
  {
    id: 'ff_seed_cohort',
    key: 'cohort-retention-matrix',
    name: 'Cohort retention matrisi',
    enabled: true,
    rolloutPct: 100,
    environments: ['preview', 'production'],
    tags: ['super-admin', 'analytics'],
    createdISO: '2026-05-08T00:00:00Z',
    modifiedISO: '2026-05-12T00:00:00Z',
  },
  {
    id: 'ff_seed_ip_allowlist',
    key: 'ip-allowlist-enforcement',
    name: 'IP allowlist enforcement',
    enabled: false,
    rolloutPct: 0,
    environments: ['development'],
    tags: ['super-admin', 'security'],
    createdISO: '2026-05-12T00:00:00Z',
    modifiedISO: '2026-05-12T00:00:00Z',
  },
  {
    id: 'ff_seed_og_png',
    key: 'og-png-satori',
    name: 'OG PNG (Satori)',
    enabled: true,
    rolloutPct: 100,
    environments: ['production'],
    tags: ['public-site', 'seo'],
    createdISO: '2026-05-11T00:00:00Z',
    modifiedISO: '2026-05-13T00:00:00Z',
  },
]

function readStore(): FeatureFlag[] | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as FeatureFlag[]) : null
  } catch {
    return null
  }
}

function writeStore(flags: FeatureFlag[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(flags))
  } catch {
    /* ignore */
  }
}

export function getFeatureFlags(): FeatureFlag[] {
  const stored = readStore()
  if (stored !== null) return stored
  writeStore(SEED)
  return [...SEED]
}

export function getFeatureFlag(id: string): FeatureFlag | null {
  return getFeatureFlags().find((f) => f.id === id) ?? null
}

export interface CreateFlagInput {
  key: string
  name: string
  description?: string
  rolloutPct?: number
  environments?: FlagEnvironment[]
  tags?: string[]
}

export function createFeatureFlag(input: CreateFlagInput): FeatureFlag {
  const flags = getFeatureFlags()
  if (flags.some((f) => f.key === input.key)) {
    throw new Error('Bu anahtar zaten kayıtlı')
  }
  const now = new Date().toISOString()
  const flag: FeatureFlag = {
    id: `ff_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    key: input.key,
    name: input.name,
    description: input.description,
    enabled: false,
    rolloutPct: input.rolloutPct ?? 0,
    environments: input.environments ?? [],
    tags: input.tags ?? [],
    createdISO: now,
    modifiedISO: now,
  }
  flags.push(flag)
  writeStore(flags)
  return flag
}

export function updateFeatureFlag(
  id: string,
  patch: Partial<Omit<FeatureFlag, 'id' | 'createdISO'>>,
): FeatureFlag | null {
  const flags = getFeatureFlags()
  const idx = flags.findIndex((f) => f.id === id)
  if (idx < 0) return null
  const next: FeatureFlag = {
    ...flags[idx],
    ...patch,
    modifiedISO: new Date().toISOString(),
  }
  flags[idx] = next
  writeStore(flags)
  return next
}

export function toggleFeatureFlag(id: string): FeatureFlag | null {
  const flag = getFeatureFlag(id)
  if (!flag) return null
  return updateFeatureFlag(id, { enabled: !flag.enabled })
}

export function deleteFeatureFlag(id: string): void {
  const flags = getFeatureFlags().filter((f) => f.id !== id)
  writeStore(flags)
}

function hashUser(userId: string): number {
  let h = 0
  for (let i = 0; i < userId.length; i++) {
    h = (h << 5) - h + userId.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h) % 100
}

export interface FlagContext {
  userId?: string
  environment?: FlagEnvironment
}

export function isFeatureEnabled(key: string, ctx: FlagContext = {}): boolean {
  const flag = getFeatureFlags().find((f) => f.key === key)
  if (!flag || !flag.enabled) return false
  if (ctx.environment && !flag.environments.includes(ctx.environment)) return false
  if (flag.rolloutPct >= 100) return true
  if (flag.rolloutPct <= 0) return false
  const bucket = ctx.userId ? hashUser(ctx.userId) : Math.floor(Math.random() * 100)
  return bucket < flag.rolloutPct
}

export function resetFeatureFlagsForTests(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(FEATURE_FLAGS_STORAGE_KEY)
}
