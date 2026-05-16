// Wave F12.A — platform-llm-cost.ts
// Per-call LLM cost entries seeded deterministically (FNV-1a) over the last 90 days.
// Used by /ops/llm-cost route, components in components/llm-cost/.
// SSR-safe; storage key `arsam.platform-llm-cost.v1` reserved for future write-back.

import { TENANTS } from '@landx/data'

export const LLM_COST_STORAGE_KEY = 'arsam.platform-llm-cost.v1'

export type LlmModel = 'gpt-4' | 'claude-sonnet' | 'gemini-pro'

export interface LlmCostEntry {
  id: string
  timestamp: number
  model: LlmModel
  tenantId: string
  promptTokens: number
  completionTokens: number
  costTL: number
}

export const MODELS: readonly LlmModel[] = ['gpt-4', 'claude-sonnet', 'gemini-pro'] as const

// ─── Deterministic hash (FNV-1a 32-bit) ──────────────────────────────────────

function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    // 32-bit FNV prime multiplication (avoid 53-bit float drift)
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

// ─── Seed (200 entries over 90 days, deterministic) ──────────────────────────

const ENTRY_COUNT = 200

const MODEL_COST_PER_1K: Record<LlmModel, { prompt: number; completion: number }> = {
  'gpt-4': { prompt: 0.9, completion: 1.8 },
  'claude-sonnet': { prompt: 0.6, completion: 1.4 },
  'gemini-pro': { prompt: 0.35, completion: 0.9 },
}

let seedCache: LlmCostEntry[] | null = null

export function seedLlmCostEntries(): LlmCostEntry[] {
  if (seedCache) return seedCache
  // Anchor the seed to "now" at first call so the 90-day window stays current
  // relative to wall-clock time. The id + dayBucket hash keeps the rest of
  // the entry deterministic — only the timestamp shifts with real time.
  const nowMs = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000
  const entries: LlmCostEntry[] = []
  for (let i = 0; i < ENTRY_COUNT; i++) {
    const id = `llm-${String(i).padStart(4, '0')}`
    // Offset back 0–89 days, plus a deterministic minute within that day.
    const dayBucket = pickInt(`${id}:day`, 0, 89)
    const minuteOfDay = pickInt(`${id}:min`, 0, 24 * 60 - 1)
    // Compute timestamp as nowMs minus (dayBucket whole days) minus (1 day minus minuteOfDay)
    // → result is in [nowMs - 90d, nowMs] inclusive.
    const timestamp = nowMs - dayBucket * DAY_MS - (DAY_MS - minuteOfDay * 60_000)

    const model = pickFrom(`${id}:model:${dayBucket}`, MODELS)
    const tenantId = pickFrom(`${id}:tenant:${dayBucket}`, TENANTS).id
    const promptTokens = pickInt(`${id}:prompt`, 200, 4000)
    const completionTokens = pickInt(`${id}:completion`, 100, 2000)

    const rate = MODEL_COST_PER_1K[model]
    const usdRaw =
      (promptTokens / 1000) * rate.prompt + (completionTokens / 1000) * rate.completion
    // Display cost in TL (USD * 33.5 ≈ rate-mock); rounded to cents.
    const costTL = Math.round(usdRaw * 33.5 * 100) / 100

    entries.push({ id, timestamp, model, tenantId, promptTokens, completionTokens, costTL })
  }
  // Newest first for nicer table default
  entries.sort((a, b) => b.timestamp - a.timestamp)
  seedCache = entries
  return entries
}

export function getLlmCostEntries(): LlmCostEntry[] {
  return seedLlmCostEntries()
}

// ─── Aggregations ────────────────────────────────────────────────────────────

export interface LlmCostKpis {
  totalCostTL: number
  totalCalls: number
  avgCostPerCallTL: number
  topModel: LlmModel | null
}

export function computeLlmKpis(entries: readonly LlmCostEntry[]): LlmCostKpis {
  if (entries.length === 0) {
    return { totalCostTL: 0, totalCalls: 0, avgCostPerCallTL: 0, topModel: null }
  }
  const totalCostTL = entries.reduce((s, e) => s + e.costTL, 0)
  const byModel = new Map<LlmModel, number>()
  for (const e of entries) {
    byModel.set(e.model, (byModel.get(e.model) ?? 0) + e.costTL)
  }
  let topModel: LlmModel | null = null
  let topModelCost = -1
  for (const [m, c] of byModel) {
    if (c > topModelCost) {
      topModel = m
      topModelCost = c
    }
  }
  return {
    totalCostTL: Math.round(totalCostTL * 100) / 100,
    totalCalls: entries.length,
    avgCostPerCallTL: Math.round((totalCostTL / entries.length) * 100) / 100,
    topModel,
  }
}

export interface ModelSummaryRow {
  model: LlmModel
  callCount: number
  totalCostTL: number
  avgCostTL: number
  totalTokens: number
}

export function summarizeByModel(entries: readonly LlmCostEntry[]): ModelSummaryRow[] {
  const map = new Map<LlmModel, { callCount: number; totalCostTL: number; totalTokens: number }>()
  for (const e of entries) {
    const prev = map.get(e.model) ?? { callCount: 0, totalCostTL: 0, totalTokens: 0 }
    prev.callCount += 1
    prev.totalCostTL += e.costTL
    prev.totalTokens += e.promptTokens + e.completionTokens
    map.set(e.model, prev)
  }
  return Array.from(map.entries())
    .map(([model, v]) => ({
      model,
      callCount: v.callCount,
      totalCostTL: Math.round(v.totalCostTL * 100) / 100,
      avgCostTL: Math.round((v.totalCostTL / Math.max(v.callCount, 1)) * 100) / 100,
      totalTokens: v.totalTokens,
    }))
    .sort((a, b) => b.totalCostTL - a.totalCostTL)
}

export interface TenantSummaryRow {
  tenantId: string
  callCount: number
  totalCostTL: number
}

export function summarizeByTenant(entries: readonly LlmCostEntry[]): TenantSummaryRow[] {
  const map = new Map<string, { callCount: number; totalCostTL: number }>()
  for (const e of entries) {
    const prev = map.get(e.tenantId) ?? { callCount: 0, totalCostTL: 0 }
    prev.callCount += 1
    prev.totalCostTL += e.costTL
    map.set(e.tenantId, prev)
  }
  return Array.from(map.entries())
    .map(([tenantId, v]) => ({
      tenantId,
      callCount: v.callCount,
      totalCostTL: Math.round(v.totalCostTL * 100) / 100,
    }))
    .sort((a, b) => b.totalCostTL - a.totalCostTL)
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export const MODEL_LABEL: Record<LlmModel, string> = {
  'gpt-4': 'GPT-4',
  'claude-sonnet': 'Claude Sonnet',
  'gemini-pro': 'Gemini Pro',
}

/** Test-only: reset the deterministic seed cache. */
export function resetLlmCostForTests(): void {
  seedCache = null
}
