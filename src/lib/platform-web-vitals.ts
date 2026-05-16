// Wave F12.B — Platform Web Vitals (super-admin /ops/web-vitals).
// Mock-only deterministic seed of 500 Core Web Vitals samples over 30 days
// across multiple page paths, devices and browsers. Provides percentile +
// status helpers backed by the public Google Core Web Vitals thresholds.
//
// Schema: arsam.platform-web-vitals.v1 (localStorage backed; first read
// seeds 500 entries; entries are READ-ONLY from the dashboard's POV).

// ───────────────────────────────────────────────────────────────────────────
// Types

export type VitalMetric = 'INP' | 'CLS' | 'LCP' | 'FCP' | 'TTFB'
export type VitalStatus = 'green' | 'amber' | 'red'
export type VitalDevice = 'desktop' | 'mobile' | 'tablet'
export type VitalBrowser = 'chrome' | 'safari' | 'firefox' | 'edge'

export interface VitalEntry {
  id: string
  timestamp: number
  page: string
  device: VitalDevice
  browser: VitalBrowser
  metric: VitalMetric
  value: number
}

export const METRICS: readonly VitalMetric[] = ['INP', 'CLS', 'LCP', 'FCP', 'TTFB'] as const
export const DEVICES: readonly VitalDevice[] = ['desktop', 'mobile', 'tablet'] as const
export const BROWSERS: readonly VitalBrowser[] = ['chrome', 'safari', 'firefox', 'edge'] as const

export const PAGES: readonly string[] = [
  '/',
  '/ilan/[id]',
  '/ara',
  '/hesabim',
  '/hesabim/ilanlarim',
  '/hesabim/mesajlarim',
  '/ilan-ver',
  '/giris',
  '/kayit',
  '/yardim',
] as const

// Google Core Web Vitals thresholds (ms unless noted).
// LCP / FCP / TTFB / INP are milliseconds; CLS is a unitless score.
export interface VitalThreshold {
  /** Strictly less than = green */
  greenMax: number
  /** Strictly less than = amber; else red */
  amberMax: number
  unit: 'ms' | 'score'
}

export const THRESHOLDS: Record<VitalMetric, VitalThreshold> = {
  LCP: { greenMax: 2500, amberMax: 4000, unit: 'ms' },
  INP: { greenMax: 200, amberMax: 500, unit: 'ms' },
  CLS: { greenMax: 0.1, amberMax: 0.25, unit: 'score' },
  FCP: { greenMax: 1800, amberMax: 3000, unit: 'ms' },
  TTFB: { greenMax: 800, amberMax: 1800, unit: 'ms' },
}

export const METRIC_LABEL: Record<VitalMetric, string> = {
  INP: 'Interaction to Next Paint',
  CLS: 'Cumulative Layout Shift',
  LCP: 'Largest Contentful Paint',
  FCP: 'First Contentful Paint',
  TTFB: 'Time to First Byte',
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers — percentile + status

/**
 * Linear-interpolation-free percentile: sorts the values then picks the index
 * `ceil(p * n) - 1` (clamped). Matches the simple p75 helper used elsewhere in
 * super-admin so dashboard math stays consistent across modules.
 *
 * `p` is in the [0, 1] range. Returns 0 for empty inputs.
 */
export function getPercentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const clampedP = Math.min(1, Math.max(0, p))
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(clampedP * sorted.length) - 1))
  return sorted[idx]!
}

/**
 * Return the Google Core Web Vitals status bucket for a given metric + value.
 * - Green: value strictly less than the metric's green threshold.
 * - Amber: value strictly less than the metric's amber threshold.
 * - Red:   value at or above the amber threshold.
 */
export function getStatus(metric: VitalMetric, value: number): VitalStatus {
  const t = THRESHOLDS[metric]
  if (value < t.greenMax) return 'green'
  if (value < t.amberMax) return 'amber'
  return 'red'
}

export const STATUS_LABEL: Record<VitalStatus, string> = {
  green: 'İyi',
  amber: 'Geliştirilmeli',
  red: 'Zayıf',
}

// ───────────────────────────────────────────────────────────────────────────
// Deterministic mock seed

const SEED_COUNT = 500
const SEED_SPAN_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
// Anchor the seed window to a fixed end so the deterministic stream stays
// stable for tests + visual regression. Snapshot picked the wave commit day.
const SEED_END_MS = Date.UTC(2026, 4, 14, 12, 0, 0)
const SEED_START_MS = SEED_END_MS - SEED_SPAN_MS

/**
 * Cheap deterministic PRNG — mulberry32. Same seed → same sequence.
 * We derive a unique seed per entry id so each field is reproducible.
 */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return function () {
    t = (t + 0x6d2b79f5) >>> 0
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** Sample a metric value with a realistic distribution per metric. */
function sampleValue(metric: VitalMetric, rnd: () => number): number {
  // Use a triangular-ish distribution so most values land in the green/amber
  // band but ~10-15% spill into red — gives the AlertPanel something to show.
  const u = (rnd() + rnd()) / 2
  switch (metric) {
    case 'LCP': {
      // 800ms - 6000ms
      const v = 800 + u * 5200
      return Math.round(v)
    }
    case 'INP': {
      // 50ms - 800ms
      const v = 50 + u * 750
      return Math.round(v)
    }
    case 'CLS': {
      // 0 - 0.40
      const v = u * 0.4
      return Math.round(v * 1000) / 1000
    }
    case 'FCP': {
      // 500ms - 4200ms
      const v = 500 + u * 3700
      return Math.round(v)
    }
    case 'TTFB': {
      // 200ms - 2400ms
      const v = 200 + u * 2200
      return Math.round(v)
    }
  }
}

/**
 * Build the 500-entry deterministic seed. Spread evenly across the 30-day
 * window so each bucket gets a reasonable sample density.
 */
export function buildSeedEntries(): VitalEntry[] {
  const entries: VitalEntry[] = []
  const step = SEED_SPAN_MS / SEED_COUNT
  for (let i = 0; i < SEED_COUNT; i++) {
    const rnd = mulberry32(i * 2654435761)
    const metric = METRICS[i % METRICS.length]
    const device = DEVICES[Math.floor(rnd() * DEVICES.length)]
    const browser = BROWSERS[Math.floor(rnd() * BROWSERS.length)]
    const page = PAGES[Math.floor(rnd() * PAGES.length)]
    const jitter = (rnd() - 0.5) * step * 0.8
    const rawTs = SEED_START_MS + i * step + jitter
    const timestamp = Math.round(Math.min(SEED_END_MS, Math.max(SEED_START_MS, rawTs)))
    const value = sampleValue(metric, rnd)
    entries.push({
      id: `wv_${i.toString(36).padStart(4, '0')}`,
      timestamp,
      page,
      device,
      browser,
      metric,
      value,
    })
  }
  return entries
}

// ───────────────────────────────────────────────────────────────────────────
// Storage

export const __STORAGE_KEY = 'arsam.platform-web-vitals.v1'

let cache: VitalEntry[] | undefined

function clone(entries: VitalEntry[]): VitalEntry[] {
  return entries.map((e) => ({ ...e }))
}

function readStorage(): VitalEntry[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(__STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    const valid: VitalEntry[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const e = item as Partial<VitalEntry>
      if (
        typeof e.id !== 'string' ||
        typeof e.timestamp !== 'number' ||
        typeof e.page !== 'string' ||
        typeof e.device !== 'string' ||
        typeof e.browser !== 'string' ||
        typeof e.metric !== 'string' ||
        typeof e.value !== 'number'
      ) {
        return null
      }
      valid.push({
        id: e.id,
        timestamp: e.timestamp,
        page: e.page,
        device: e.device as VitalDevice,
        browser: e.browser as VitalBrowser,
        metric: e.metric as VitalMetric,
        value: e.value,
      })
    }
    return valid.length > 0 ? valid : null
  } catch {
    return null
  }
}

function writeStorage(entries: VitalEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(__STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* quota / privacy mode — swallow */
  }
}

function load(): VitalEntry[] {
  if (cache) return cache
  const persisted = readStorage()
  if (persisted) {
    cache = persisted
    return cache
  }
  cache = buildSeedEntries()
  writeStorage(cache)
  return cache
}

// ───────────────────────────────────────────────────────────────────────────
// Public API

export function getEntries(): VitalEntry[] {
  return clone(load())
}

export interface VitalFilter {
  metric?: VitalMetric
  device?: VitalDevice
  browser?: VitalBrowser
  page?: string
  startMs?: number
  endMs?: number
}

export function filterEntries(entries: VitalEntry[], filter: VitalFilter): VitalEntry[] {
  return entries.filter((e) => {
    if (filter.metric && e.metric !== filter.metric) return false
    if (filter.device && e.device !== filter.device) return false
    if (filter.browser && e.browser !== filter.browser) return false
    if (filter.page && e.page !== filter.page) return false
    if (filter.startMs != null && e.timestamp < filter.startMs) return false
    if (filter.endMs != null && e.timestamp > filter.endMs) return false
    return true
  })
}

export interface MetricSummary {
  metric: VitalMetric
  count: number
  p50: number
  p75: number
  p95: number
  /** Status calculated against the p75 value (Google's canonical CWV pick). */
  status: VitalStatus
}

export function summarizeMetric(entries: VitalEntry[], metric: VitalMetric): MetricSummary {
  const values = entries.filter((e) => e.metric === metric).map((e) => e.value)
  const p50 = getPercentile(values, 0.5)
  const p75 = getPercentile(values, 0.75)
  const p95 = getPercentile(values, 0.95)
  return {
    metric,
    count: values.length,
    p50,
    p75,
    p95,
    status: getStatus(metric, p75),
  }
}

export function summarizeAll(entries: VitalEntry[]): MetricSummary[] {
  return METRICS.map((m) => summarizeMetric(entries, m))
}

export interface AlertItem {
  entry: VitalEntry
  threshold: number
  exceedBy: number
}

/**
 * Returns entries whose value exceeds the amber→red threshold (i.e. status
 * === 'red'). Sorted by exceedBy descending, capped to `limit`.
 */
export function getAlerts(entries: VitalEntry[], limit = 20): AlertItem[] {
  const alerts: AlertItem[] = []
  for (const entry of entries) {
    if (getStatus(entry.metric, entry.value) !== 'red') continue
    const threshold = THRESHOLDS[entry.metric].amberMax
    alerts.push({
      entry,
      threshold,
      exceedBy: entry.value - threshold,
    })
  }
  alerts.sort((a, b) => b.exceedBy - a.exceedBy)
  return alerts.slice(0, limit)
}

export interface BucketSeries {
  metric: VitalMetric
  /** Bucket boundaries (length = points.length + 1). */
  buckets: number[]
  /** One point per bucket: { p50, p75, p95, count }. */
  points: { bucketStart: number; p50: number; p75: number; p95: number; count: number }[]
}

/**
 * Bucket entries by time and produce p50/p75/p95 series per metric. Used by
 * VitalsChart. `bucketCount` defaults to 24.
 */
export function bucketSeries(
  entries: VitalEntry[],
  metric: VitalMetric,
  buckets: number[],
): BucketSeries {
  const filtered = entries.filter((e) => e.metric === metric)
  const bucketCount = buckets.length - 1
  const groups: number[][] = Array.from({ length: bucketCount }, () => [])
  const span = buckets[bucketCount] - buckets[0]
  for (const entry of filtered) {
    if (entry.timestamp < buckets[0] || entry.timestamp > buckets[bucketCount]) continue
    let idx = Math.floor(((entry.timestamp - buckets[0]) / span) * bucketCount)
    if (idx >= bucketCount) idx = bucketCount - 1
    if (idx < 0) idx = 0
    groups[idx].push(entry.value)
  }
  const points = groups.map((values, i) => ({
    bucketStart: buckets[i],
    p50: getPercentile(values, 0.5),
    p75: getPercentile(values, 0.75),
    p95: getPercentile(values, 0.95),
    count: values.length,
  }))
  return { metric, buckets, points }
}

export function getDistinctPages(entries: VitalEntry[]): string[] {
  return Array.from(new Set(entries.map((e) => e.page))).sort()
}

// ───────────────────────────────────────────────────────────────────────────
// Test helpers

/** Reset the in-memory cache between tests. */
export function __resetPlatformWebVitalsForTests(): void {
  cache = undefined
}

export const __SEED_END_MS = SEED_END_MS
export const __SEED_START_MS = SEED_START_MS
export const __SEED_COUNT = SEED_COUNT
