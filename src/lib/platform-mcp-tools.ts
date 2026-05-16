// Wave F12.C — super-admin MCP tool call analytics store.
// Deterministic seed (300 calls over 30d), no mutation/CRUD — purely read-only
// analytics. Lazy-initialised cached snapshot; rebuilds when `clearMcpToolsCache`
// is called from tests.

const KEY = 'arsam.platform-mcp-tools.v1'

export type McpCallStatus = 'success' | 'error' | 'timeout'

export interface McpToolCall {
  id: string
  toolName: string
  status: McpCallStatus
  durationMs: number
  agentId: string
  timestampMs: number
  /** Optional human-readable error message — only set when status !== 'success' */
  errorMessage?: string
}

export interface McpToolSummary {
  toolName: string
  callCount: number
  successCount: number
  errorCount: number
  timeoutCount: number
  successRate: number // 0..1
  avgDurationMs: number
  p95DurationMs: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MCP_TOOL_NAMES = [
  'fetch-listing',
  'send-email',
  'crm-lookup',
  'compute-pricing',
  'audit-action',
  'pii-scrub',
  'webhook-trigger',
  'gen-report',
] as const

export type McpToolName = (typeof MCP_TOOL_NAMES)[number]

const AGENT_IDS = ['agt-assistant', 'agt-classifier', 'agt-extractor', 'agt-pricing', 'agt-compliance']

const ERROR_MESSAGES: Record<McpCallStatus, string[]> = {
  success: [],
  error: [
    'HTTP 500 upstream',
    'invalid arguments',
    'permission denied',
    'rate limit exceeded',
    'schema validation failed',
  ],
  timeout: [
    'deadline exceeded (5s)',
    'connection reset',
    'upstream unreachable',
  ],
}

// ─── Deterministic seed ──────────────────────────────────────────────────────

/**
 * Mulberry32 PRNG — deterministic, fast, good distribution for mock data.
 * Same seed → same sequence; production code uses crypto.getRandomValues instead.
 */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Build the deterministic 300-call seed spread over the past 30 days.
 *  - Status mix: 75% success, 15% error, 10% timeout
 *  - durationMs: success 50-2000, error 100-500, timeout 5000-7000
 *  - timestamps anchored to a fixed reference epoch so render snapshots stay stable
 *
 * @internal exported for tests; consumer code should use `getMcpToolCalls()`.
 */
export function _buildSeedCalls(refNowMs: number, count = 300): McpToolCall[] {
  const rng = mulberry32(0x4f12c001)
  const DAY = 86_400_000
  const spanMs = 30 * DAY
  const calls: McpToolCall[] = []

  for (let i = 0; i < count; i++) {
    const toolName = MCP_TOOL_NAMES[Math.floor(rng() * MCP_TOOL_NAMES.length)]
    const agentId = AGENT_IDS[Math.floor(rng() * AGENT_IDS.length)]

    // Status by weighted bucket.
    const r = rng()
    let status: McpCallStatus
    if (r < 0.75) status = 'success'
    else if (r < 0.9) status = 'error'
    else status = 'timeout'

    let durationMs: number
    if (status === 'success') {
      durationMs = Math.round(50 + rng() * 1950) // 50..2000
    } else if (status === 'error') {
      durationMs = Math.round(100 + rng() * 400) // 100..500
    } else {
      durationMs = Math.round(5000 + rng() * 2000) // 5000..7000
    }

    // Spread timestamps across span — use rng for offset and add an extra
    // deterministic jitter from i so same-bucket calls don't all share ts.
    const offset = Math.floor(rng() * spanMs)
    const timestampMs = refNowMs - spanMs + offset + (i % 60) * 1000

    const errorList = ERROR_MESSAGES[status]
    const errorMessage = errorList.length
      ? errorList[Math.floor(rng() * errorList.length)]
      : undefined

    calls.push({
      id: `call-${String(i + 1).padStart(4, '0')}`,
      toolName,
      status,
      durationMs,
      agentId,
      timestampMs,
      errorMessage,
    })
  }

  // Sort newest-first for predictable list iteration.
  calls.sort((a, b) => b.timestampMs - a.timestampMs)
  return calls
}

// ─── IO + cache ──────────────────────────────────────────────────────────────

let cachedCalls: McpToolCall[] | null = null

/**
 * Reference "now" anchor for seed timestamps. Pinned so the deterministic
 * dataset stays stable across renders / SSR / test runs. Equals 2026-05-14
 * 00:00 UTC (the wave landing date).
 */
const SEED_NOW_MS = Date.parse('2026-05-14T00:00:00.000Z')

function read(): McpToolCall[] {
  if (cachedCalls) return cachedCalls
  if (typeof window === 'undefined') {
    cachedCalls = _buildSeedCalls(SEED_NOW_MS)
    return cachedCalls
  }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      const built = _buildSeedCalls(SEED_NOW_MS)
      window.localStorage.setItem(KEY, JSON.stringify(built))
      cachedCalls = built
      return built
    }
    const parsed = JSON.parse(raw) as McpToolCall[] | null
    if (!parsed || !Array.isArray(parsed)) {
      const built = _buildSeedCalls(SEED_NOW_MS)
      window.localStorage.setItem(KEY, JSON.stringify(built))
      cachedCalls = built
      return built
    }
    cachedCalls = parsed
    return parsed
  } catch {
    cachedCalls = _buildSeedCalls(SEED_NOW_MS)
    return cachedCalls
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getMcpToolCalls(): McpToolCall[] {
  return read()
}

export function getMcpToolCallsInRange(startMs: number, endMs: number): McpToolCall[] {
  return read().filter((c) => c.timestampMs >= startMs && c.timestampMs <= endMs)
}

export function getMcpToolCallsByTool(toolName: string, limit = 30): McpToolCall[] {
  return read()
    .filter((c) => c.toolName === toolName)
    .slice(0, limit)
}

/**
 * Compute per-tool summary table over the given call set.
 * Returns one row per known tool (always 8 rows even if a tool has zero calls)
 * sorted by callCount desc.
 */
export function summarizeMcpTools(calls: McpToolCall[]): McpToolSummary[] {
  const map = new Map<string, McpToolCall[]>()
  for (const name of MCP_TOOL_NAMES) map.set(name, [])
  for (const c of calls) {
    const bucket = map.get(c.toolName)
    if (bucket) bucket.push(c)
  }
  const out: McpToolSummary[] = []
  for (const [toolName, bucket] of map) {
    const callCount = bucket.length
    const successCount = bucket.filter((c) => c.status === 'success').length
    const errorCount = bucket.filter((c) => c.status === 'error').length
    const timeoutCount = bucket.filter((c) => c.status === 'timeout').length
    const successRate = callCount === 0 ? 0 : successCount / callCount
    const avgDurationMs =
      callCount === 0
        ? 0
        : Math.round(bucket.reduce((s, c) => s + c.durationMs, 0) / callCount)

    // p95 via simple sort — dataset is small (max ~50 per tool).
    const sortedDurations = bucket.map((c) => c.durationMs).sort((a, b) => a - b)
    const p95Idx = Math.max(0, Math.ceil(sortedDurations.length * 0.95) - 1)
    const p95DurationMs = sortedDurations[p95Idx] ?? 0

    out.push({
      toolName,
      callCount,
      successCount,
      errorCount,
      timeoutCount,
      successRate,
      avgDurationMs,
      p95DurationMs,
    })
  }
  out.sort((a, b) => b.callCount - a.callCount)
  return out
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<McpCallStatus, string> = {
  success: 'Başarılı',
  error: 'Hata',
  timeout: 'Zaman aşımı',
}

export const STATUS_TONE: Record<McpCallStatus, string> = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  error: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  timeout: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

export function formatDurationMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms}ms`
}

// ─── Test-only ───────────────────────────────────────────────────────────────

/** @internal Reset cache + storage. Production code shouldn't call. */
export function _resetMcpToolsForTests(): void {
  cachedCalls = null
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* localStorage may be replaced by test shim */
  }
}

/** @internal Storage key exposed for assertions. */
export const STORAGE_KEY_FOR_TESTS = KEY
