// Wave F12.C — super-admin prompt-library version analytics store.
// Deterministic seed (15 prompts × 3-5 versions each), read-only mock —
// supports diff comparison + change-reason history rendering.

const KEY = 'arsam.platform-prompts.v1'

export type PromptVersionStatus = 'active' | 'archived' | 'draft'

export interface PromptVersion {
  id: string
  /** Stable prompt identifier (shared across versions of the same prompt) */
  promptId: string
  /** Display name (shared across versions of the same prompt) */
  name: string
  /** Version label: v1.0 / v1.1 / v2.0 */
  version: string
  status: PromptVersionStatus
  template: string
  usageCount: number
  lastUsedAtMs: number
  createdAtMs: number
  changeReason: string
}

export interface PromptGroup {
  promptId: string
  name: string
  versions: PromptVersion[]
  /** Convenience: latest non-draft version (active else first archived) */
  activeVersion: PromptVersion
  totalUsage: number
  lastUsedAtMs: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const PROMPT_NAMES = [
  'system-assistant',
  'lead-qualifier',
  'listing-summarizer',
  'crm-followup',
  'compliance-check',
  'price-estimator',
  'pii-redactor',
  'contract-drafter',
  'sentiment-classifier',
  'tag-extractor',
  'image-captioner',
  'lead-router',
  'audit-summarizer',
  'webhook-payload-builder',
  'support-triage',
] as const

export type PromptName = (typeof PROMPT_NAMES)[number]

export const CHANGE_REASONS = ['İyileştirme', 'Bug fix', 'Yeni özellik', 'Refactor'] as const

// ─── Deterministic seed ──────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TEMPLATE_LINES: Record<PromptName, string[]> = {
  'system-assistant': [
    'Sen Türkçe-anadili emlak asistanısın.',
    'Görev: ofis envanteri ve müşteri sorularına net cevap vermek.',
    'KVKK kuralı: TC kimlik / IBAN / telefon → maskele.',
    'Para birimi formatı: "₺1.250.000".',
    'Belirsiz referansı netleştir, varsayım yapma.',
    'Tonlama: profesyonel, kısa, argo yok.',
  ],
  'lead-qualifier': [
    'Verilen müşteri kaydını lead skorla (0-100).',
    'Sinyaller: gelir bandı, lokasyon eşleşmesi, ilan görüntüleme sayısı.',
    'Bütçe < 500k ise düşük puan ver.',
    'Telefon doğrulanmamışsa otomatik 30 puan düş.',
    'Çıktı: { score, reason, nextAction }.',
  ],
  'listing-summarizer': [
    'Verilen ilan JSON\'ından 3 cümlelik özet üret.',
    'İlk cümle: tip + lokasyon + brüt m².',
    'İkinci cümle: en az 2 öne çıkan özellik.',
    'Üçüncü cümle: fiyat ve ipucu (m² başına).',
    'Tonlama: pazarlama, ama abartısız.',
  ],
  'crm-followup': [
    'Müşteri yolculuğunda sıradaki adımı öner.',
    'Bağlam: son etkileşim ts, ilgilendiği ilanlar.',
    'Eğer 7 günden eski etkileşim: hatırlatma metni öner.',
    'Çıktı: { channel, message, scheduleAt }.',
  ],
  'compliance-check': [
    'Verilen metni KVKK kontrolünden geçir.',
    'TC kimlik, IBAN, e-posta, telefon → flag et.',
    'Politik / dini ifade → uyarı işareti.',
    'Çıktı: { flags: string[], severity: low|med|high }.',
  ],
  'price-estimator': [
    'İlan girdisine göre tahmini m² fiyatı hesapla.',
    'Lokasyon, tip, yaş, kat, banyo + oda sayısı al.',
    'Aralık ver (alt-üst sınır + güven aralığı).',
    'Çıktı: { perSqm, total, confidence }.',
  ],
  'pii-redactor': [
    'Verilen metinden PII\'yi maskele.',
    'TC kimlik → ***********.',
    'IBAN → ilk 4 + son 4 göster, ortayı yıldızla.',
    'Telefon → ilk 3 + son 2.',
    'E-posta → ilk harf + *** + domain.',
  ],
  'contract-drafter': [
    'Verilen anlaşma bilgilerinden satış sözleşmesi taslağı üret.',
    'Madde 1: Taraflar.',
    'Madde 2: Konu (gayrimenkul tanımı).',
    'Madde 3: Bedel + ödeme planı.',
    'Madde 4: Cezai şart.',
    'Madde 5: Tahkim.',
  ],
  'sentiment-classifier': [
    'Verilen müşteri mesajını sınıflandır.',
    'Etiketler: pozitif | nötr | negatif | kritik.',
    'Kritik = şikayet + tehdit içeren ifade.',
    'Çıktı: { label, confidence }.',
  ],
  'tag-extractor': [
    'İlan açıklamasından etiket çıkar.',
    'Maks 8 etiket, küçük harfli, tire-ayrılmış.',
    'Etiket kategorileri: konum, oda, manzara, malzeme.',
    'Çıktı: string[].',
  ],
  'image-captioner': [
    'İlan görseline kısa altyazı yaz.',
    'Maks 80 karakter.',
    'Tonlama: tanımlayıcı, satışa yönlendirme yok.',
    'Eğer kalite düşük → "düşük çözünürlük" notu ekle.',
  ],
  'lead-router': [
    'Müşteriyi en uygun temsilciye yönlendir.',
    'Sinyaller: uzmanlık eşleşmesi, son 7g müsaitlik, gelir hedefi.',
    'Adil dağıtım: round-robin son tercih.',
    'Çıktı: { agentId, reason }.',
  ],
  'audit-summarizer': [
    'Verilen audit log dilimini özetle.',
    'En kritik 3 olayı listele.',
    'Anomali (örn. 03:00 admin login) → ayrı flag.',
    'Çıktı: markdown + json bloğu.',
  ],
  'webhook-payload-builder': [
    'Verilen iç olaydan webhook payload\'ı üret.',
    'JSON şeması: { event, occurredAt, data }.',
    'PII alanlarını redact et.',
    'imza için sha256 hash hesapla.',
  ],
  'support-triage': [
    'Destek talebini kategorize et + öncelik ata.',
    'Kategoriler: faturalama, teknik, ürün, KVKK.',
    'Öncelik: P0 (sistem down) → P3 (öneri).',
    'Çıktı: { category, priority, suggestedOwner }.',
  ],
}

/** Apply a deterministic version-specific variation to template lines. */
function mutateLinesForVersion(base: string[], versionIndex: number, rng: () => number): string[] {
  if (versionIndex === 0) return base.slice()
  const lines = base.slice()

  // v1.1 — small wording tweak on last line
  if (versionIndex === 1) {
    const idx = lines.length - 1
    lines[idx] = `${lines[idx]} (v1.1 iyileştirme)`
  }

  // v2.0 — add a "Yenilik" line + tweak first line
  if (versionIndex >= 2) {
    lines[0] = lines[0].replace(/\.$/, '.') + ' [v2 davranış]'
    lines.push(`Yenilik #${versionIndex}: çıktı formatı yapılandırıldı.`)
  }

  // v3.0+ — drop a middle line to simulate refactor
  if (versionIndex >= 3 && lines.length > 3) {
    const dropAt = 1 + Math.floor(rng() * (lines.length - 2))
    lines.splice(dropAt, 1)
  }

  // v4.0 — append a guardrail
  if (versionIndex >= 4) {
    lines.push('Guardrail: bağlam dışı sorulara "bilmiyorum" yanıtla.')
  }
  return lines
}

/** Ensure the rendered template is between 200-400 chars. Pad if short. */
function padToRange(s: string, min = 200, max = 400, padder = 'Notlar: bağlam-duyarlı, deterministik, KVKK uyumlu.'): string {
  let out = s
  while (out.length < min) {
    out += `\n${padder}`
  }
  if (out.length > max) {
    out = out.slice(0, max - 3) + '...'
  }
  return out
}

const VERSION_LABELS = ['v1.0', 'v1.1', 'v2.0', 'v3.0', 'v4.0']

/** Reference "now" anchor — pinned so version timestamps stay stable. */
const SEED_NOW_MS = Date.parse('2026-05-14T00:00:00.000Z')

/**
 * Build the deterministic prompt-library seed: 15 prompts × 3-5 versions each.
 *
 * @internal exported for tests; consumer code should use `getPromptGroups()`.
 */
export function _buildSeedPrompts(refNowMs: number): PromptVersion[] {
  const rng = mulberry32(0x90171517)
  const DAY = 86_400_000
  const all: PromptVersion[] = []

  for (let pi = 0; pi < PROMPT_NAMES.length; pi++) {
    const name = PROMPT_NAMES[pi]
    const versionCount = 3 + Math.floor(rng() * 3) // 3..5
    const baseLines = TEMPLATE_LINES[name]
    const promptId = `prm-${String(pi + 1).padStart(2, '0')}-${name}`

    for (let vi = 0; vi < versionCount; vi++) {
      const lines = mutateLinesForVersion(baseLines, vi, rng)
      const template = padToRange(lines.join('\n'))
      const version = VERSION_LABELS[vi] ?? `v${vi + 1}.0`

      // Newer versions = more usage, more recent lastUsed.
      const isLatest = vi === versionCount - 1
      const usageBase = isLatest ? 800 : 200
      const usageCount = Math.round(usageBase + rng() * 1500)
      const lastUsedAtMs = refNowMs - Math.floor(rng() * (isLatest ? 7 : 60) * DAY)
      const createdAtMs = refNowMs - (versionCount - vi) * 14 * DAY - Math.floor(rng() * 3 * DAY)
      const status: PromptVersionStatus = isLatest ? 'active' : 'archived'
      const changeReason = vi === 0 ? 'İlk sürüm' : CHANGE_REASONS[Math.floor(rng() * CHANGE_REASONS.length)]

      all.push({
        id: `${promptId}--${version}`,
        promptId,
        name,
        version,
        status,
        template,
        usageCount,
        lastUsedAtMs,
        createdAtMs,
        changeReason,
      })
    }
  }

  return all
}

// ─── IO + cache ──────────────────────────────────────────────────────────────

let cachedVersions: PromptVersion[] | null = null

function read(): PromptVersion[] {
  if (cachedVersions) return cachedVersions
  if (typeof window === 'undefined') {
    cachedVersions = _buildSeedPrompts(SEED_NOW_MS)
    return cachedVersions
  }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      const built = _buildSeedPrompts(SEED_NOW_MS)
      window.localStorage.setItem(KEY, JSON.stringify(built))
      cachedVersions = built
      return built
    }
    const parsed = JSON.parse(raw) as PromptVersion[] | null
    if (!parsed || !Array.isArray(parsed)) {
      const built = _buildSeedPrompts(SEED_NOW_MS)
      window.localStorage.setItem(KEY, JSON.stringify(built))
      cachedVersions = built
      return built
    }
    cachedVersions = parsed
    return parsed
  } catch {
    cachedVersions = _buildSeedPrompts(SEED_NOW_MS)
    return cachedVersions
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getPromptVersions(): PromptVersion[] {
  return read()
}

/**
 * Group versions by promptId. Returns one PromptGroup per logical prompt
 * with versions sorted oldest → newest (v1.0 first).
 */
export function getPromptGroups(): PromptGroup[] {
  const all = read()
  const map = new Map<string, PromptVersion[]>()
  for (const v of all) {
    const list = map.get(v.promptId)
    if (list) list.push(v)
    else map.set(v.promptId, [v])
  }
  const groups: PromptGroup[] = []
  for (const [promptId, versions] of map) {
    versions.sort((a, b) => a.createdAtMs - b.createdAtMs)
    const activeVersion = versions.find((v) => v.status === 'active') ?? versions[versions.length - 1]
    const totalUsage = versions.reduce((s, v) => s + v.usageCount, 0)
    const lastUsedAtMs = versions.reduce((m, v) => Math.max(m, v.lastUsedAtMs), 0)
    groups.push({
      promptId,
      name: versions[0].name,
      versions,
      activeVersion,
      totalUsage,
      lastUsedAtMs,
    })
  }
  // Sort alphabetically by name for deterministic display order.
  groups.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  return groups
}

export function getPromptGroup(promptId: string): PromptGroup | undefined {
  return getPromptGroups().find((g) => g.promptId === promptId)
}

// ─── Diff helper ─────────────────────────────────────────────────────────────

export type DiffOp = 'eq' | 'add' | 'del'

export interface DiffLine {
  op: DiffOp
  /** Left-side line (set when op !== 'add') */
  left?: string
  /** Right-side line (set when op !== 'del') */
  right?: string
}

/**
 * Simple line-by-line diff between two templates.
 *
 * Per spec, this is NOT a full LCS algorithm — it walks both line arrays in
 * parallel and emits:
 *  - 'eq'  when both lines exist and are byte-equal
 *  - 'del' when only the left side has a line at this position
 *  - 'add' when only the right side has a line at this position
 *  - 'del' + 'add' (two consecutive ops) when lines differ at the same index
 *
 * This produces a side-by-side renderable diff sufficient for the F12 mock.
 */
export function diffLines(leftText: string, rightText: string): DiffLine[] {
  const left = leftText.split('\n')
  const right = rightText.split('\n')
  const out: DiffLine[] = []
  const len = Math.max(left.length, right.length)
  for (let i = 0; i < len; i++) {
    const l = i < left.length ? left[i] : undefined
    const r = i < right.length ? right[i] : undefined
    if (l === undefined && r !== undefined) {
      out.push({ op: 'add', right: r })
    } else if (r === undefined && l !== undefined) {
      out.push({ op: 'del', left: l })
    } else if (l === r) {
      out.push({ op: 'eq', left: l, right: r })
    } else {
      out.push({ op: 'del', left: l })
      out.push({ op: 'add', right: r })
    }
  }
  return out
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<PromptVersionStatus, string> = {
  active: 'Aktif',
  archived: 'Arşiv',
  draft: 'Taslak',
}

export const STATUS_TONE: Record<PromptVersionStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  archived: 'bg-stone-500/10 text-stone-700 dark:text-stone-300',
  draft: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

// ─── Test-only ───────────────────────────────────────────────────────────────

/** @internal Reset cache + storage. Production code shouldn't call. */
export function _resetPromptsForTests(): void {
  cachedVersions = null
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* localStorage may be replaced by test shim */
  }
}

/** @internal Storage key exposed for assertions. */
export const STORAGE_KEY_FOR_TESTS = KEY
