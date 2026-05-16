// Shared TimeRange utility for F12 AI/observability panels.
// Used by llm-cost, sessions, web-vitals, mcp-tools, prompts, memory-layer, vector-store.

export type TimeRangePreset = '24h' | '7d' | '30d' | '90d' | 'custom'

export interface TimeRange {
  preset: TimeRangePreset
  startMs: number
  endMs: number
}

const PRESET_MS: Record<Exclude<TimeRangePreset, 'custom'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
}

export const PRESET_OPTIONS: TimeRangePreset[] = ['24h', '7d', '30d', '90d', 'custom']

export const PRESET_LABEL: Record<Exclude<TimeRangePreset, 'custom'>, string> = {
  '24h': 'Son 24 saat',
  '7d': 'Son 7 gün',
  '30d': 'Son 30 gün',
  '90d': 'Son 90 gün',
}

export function createPresetRange(preset: TimeRangePreset, now = Date.now()): TimeRange {
  if (preset === 'custom') {
    return { preset, startMs: now - PRESET_MS['7d'], endMs: now }
  }
  return { preset, startMs: now - PRESET_MS[preset], endMs: now }
}

export function createCustomRange(startMs: number, endMs: number): TimeRange {
  return { preset: 'custom', startMs: Math.min(startMs, endMs), endMs: Math.max(startMs, endMs) }
}

export function inRange(timestamp: number, range: TimeRange): boolean {
  return timestamp >= range.startMs && timestamp <= range.endMs
}

export function rangeDurationMs(range: TimeRange): number {
  return range.endMs - range.startMs
}

export function formatRangeLabel(range: TimeRange): string {
  if (range.preset === 'custom') {
    const fmt = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${fmt.format(range.startMs)} – ${fmt.format(range.endMs)}`
  }
  return PRESET_LABEL[range.preset]
}

/**
 * Bucket timestamps into N buckets across the time range.
 * Returns array of bucket boundaries [ts0, ts1, ts2, ...] where bucketCount = boundaries.length - 1.
 */
export function timeBuckets(range: TimeRange, bucketCount = 24): number[] {
  const step = (range.endMs - range.startMs) / bucketCount
  const buckets: number[] = []
  for (let i = 0; i <= bucketCount; i++) {
    buckets.push(range.startMs + step * i)
  }
  return buckets
}

/**
 * Group entries by time bucket. Returns array of bucket arrays.
 */
export function groupByBucket<T>(
  entries: T[],
  getTimestamp: (entry: T) => number,
  range: TimeRange,
  bucketCount = 24,
): T[][] {
  const result: T[][] = Array.from({ length: bucketCount }, () => [])
  const span = range.endMs - range.startMs
  for (const entry of entries) {
    const ts = getTimestamp(entry)
    if (ts < range.startMs || ts > range.endMs) continue
    let idx = Math.floor(((ts - range.startMs) / span) * bucketCount)
    if (idx >= bucketCount) idx = bucketCount - 1
    if (idx < 0) idx = 0
    result[idx].push(entry)
  }
  return result
}
