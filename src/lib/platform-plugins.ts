// Wave F11.B — super-admin plugin registry store.
// localStorage-backed, deterministic seed, mock async install simulation.
// SSR-safe: all reads/writes guarded by typeof window checks.

const KEY = 'arsam.platform-plugins.v1'
const EVENT = 'arsam.platform-plugins:change'
const INSTALL_DELAY_MS = 1000

export type PluginStatus = 'active' | 'disabled' | 'error' | 'installing' | 'updating'
export type PluginCategory = 'analytics' | 'integration' | 'crm' | 'security' | 'utility'

export interface PluginChangelogEntry {
  version: string
  date: string // ISO yyyy-mm-dd
  changes: string[]
}

export interface Plugin {
  id: string
  name: string
  description: string
  version: string
  category: PluginCategory
  publisher: string
  status: PluginStatus
  installedAt?: number
  permissions: string[]
  config?: Record<string, unknown>
  rating: number // 1-5
  installCount: number
  changelog?: PluginChangelogEntry[]
}

interface StoreShape {
  installed: Plugin[]
  marketplace: Plugin[]
}

// ─── Seed (deterministic) ────────────────────────────────────────────────────

const NOW = 1736380800000 // 2026-01-09 stable epoch for seed installedAt
const DAY = 86_400_000

function changelog(base: string): PluginChangelogEntry[] {
  return [
    { version: `${base}.4`, date: '2026-05-02', changes: ['Performans iyileştirmesi', 'Kritik güvenlik yaması'] },
    { version: `${base}.3`, date: '2026-04-15', changes: ['Yeni Türkçe dil desteği', 'UI rafine'] },
    { version: `${base}.2`, date: '2026-03-21', changes: ['API rate limit artırıldı', 'Bellek sızıntısı düzeltildi'] },
    { version: `${base}.1`, date: '2026-02-10', changes: ['İlk stable sürüm'] },
    { version: `${base}.0`, date: '2026-01-04', changes: ['Beta yayını'] },
  ]
}

function seed(): StoreShape {
  const installed: Plugin[] = [
    {
      id: 'pl-sahibinden-sync',
      name: 'Sahibinden Sync',
      description: 'sahibinden.com\'a ilan otomatik yayını. KVKK uyumlu, 2-yönlü senkronizasyon.',
      version: '1.4.2',
      category: 'integration',
      publisher: 'arsam.net',
      status: 'active',
      installedAt: NOW - 30 * DAY,
      permissions: ['ilan.read', 'ilan.write', 'webhook.dispatch'],
      config: { syncInterval: '15m', autoPublish: true },
      rating: 4.6,
      installCount: 1240,
      changelog: changelog('1.4'),
    },
    {
      id: 'pl-claude-assistant',
      name: 'Claude Asistan',
      description: 'Atölye asistan motoru. İlan, müşteri, satış sorularına Türkçe yanıt.',
      version: '0.9.1',
      category: 'analytics',
      publisher: 'Anthropic',
      status: 'active',
      installedAt: NOW - 18 * DAY,
      permissions: ['ai.invoke', 'crm.read', 'ilan.read'],
      config: { model: 'claude-opus-4-7', maxTokens: 4096 },
      rating: 4.9,
      installCount: 2870,
      changelog: changelog('0.9'),
    },
    {
      id: 'pl-tapu-takip',
      name: 'Tapu Takip',
      description: 'Tapu randevu, harç hesaplama, satış sonrası takip otomasyonu.',
      version: '2.1.0',
      category: 'utility',
      publisher: 'arsam.net',
      status: 'active',
      installedAt: NOW - 60 * DAY,
      permissions: ['crm.read', 'doc.read'],
      config: { reminderDays: 3 },
      rating: 4.4,
      installCount: 540,
      changelog: changelog('2.1'),
    },
    {
      id: 'pl-kvkk-vault',
      name: 'KVKK Vault',
      description: 'KVKK 11/13/15. madde otomatik yanıt, retention politikaları, açık rıza.',
      version: '1.0.4',
      category: 'security',
      publisher: 'arsam.net',
      status: 'active',
      installedAt: NOW - 45 * DAY,
      permissions: ['compliance.read', 'compliance.write', 'audit.write'],
      config: { retentionDays: 730 },
      rating: 4.7,
      installCount: 720,
      changelog: changelog('1.0'),
    },
    {
      id: 'pl-listing-analytics',
      name: 'İlan Analytics+',
      description: 'İlan görüntülenme, dönüşüm funnel, heatmap, A/B test sonuçları.',
      version: '3.2.1',
      category: 'analytics',
      publisher: 'arsam.net',
      status: 'active',
      installedAt: NOW - 90 * DAY,
      permissions: ['analytics.read', 'ilan.read'],
      config: { sampleRate: 1.0 },
      rating: 4.3,
      installCount: 1810,
      changelog: changelog('3.2'),
    },
    {
      id: 'pl-crm-pipeline',
      name: 'CRM Pipeline Pro',
      description: 'Müşteri pipeline yönetimi, otomatik fırsat puanlama, çoklu boru hattı.',
      version: '2.5.0',
      category: 'crm',
      publisher: 'arsam.net',
      status: 'active',
      installedAt: NOW - 22 * DAY,
      permissions: ['crm.read', 'crm.write'],
      config: { pipelines: 4 },
      rating: 4.5,
      installCount: 980,
      changelog: changelog('2.5'),
    },
    {
      id: 'pl-email-campaigns',
      name: 'E-posta Kampanyaları',
      description: 'Toplu e-posta gönderim, otomasyonlar, segment hedefleme.',
      version: '1.8.3',
      category: 'crm',
      publisher: 'mailchimp-partner-tr',
      status: 'active',
      installedAt: NOW - 14 * DAY,
      permissions: ['crm.read', 'email.send'],
      config: { dailyLimit: 5000 },
      rating: 4.2,
      installCount: 670,
      changelog: changelog('1.8'),
    },
    {
      id: 'pl-2fa-enforcer',
      name: '2FA Zorlayıcı',
      description: 'Tüm kullanıcılar için 2FA zorunlu, TOTP/SMS destekli.',
      version: '1.1.0',
      category: 'security',
      publisher: 'arsam.net',
      status: 'active',
      installedAt: NOW - 75 * DAY,
      permissions: ['auth.write', 'user.write'],
      config: { method: 'totp', graceDays: 7 },
      rating: 4.8,
      installCount: 1530,
      changelog: changelog('1.1'),
    },
    {
      id: 'pl-zapier-bridge',
      name: 'Zapier Köprüsü',
      description: '5000+ uygulamaya bağlanmak için Zapier entegrasyonu.',
      version: '1.3.7',
      category: 'integration',
      publisher: 'Zapier',
      status: 'active',
      installedAt: NOW - 38 * DAY,
      permissions: ['webhook.dispatch', 'crm.read'],
      config: { webhookUrl: '' },
      rating: 4.4,
      installCount: 2100,
      changelog: changelog('1.3'),
    },
    {
      id: 'pl-backup-vault',
      name: 'Yedekleme Kasası',
      description: 'Günlük otomatik yedekleme, S3 uyumlu depolama, point-in-time restore.',
      version: '1.0.2',
      category: 'utility',
      publisher: 'arsam.net',
      status: 'active',
      installedAt: NOW - 100 * DAY,
      permissions: ['storage.read', 'storage.write'],
      config: { retentionDays: 30 },
      rating: 4.6,
      installCount: 890,
      changelog: changelog('1.0'),
    },
    {
      id: 'pl-old-sync',
      name: 'Eski Sync v1',
      description: 'Eski sync motoru. Yeni Sahibinden Sync v1 ile değiştirildi — Q3\'te kapatılacak.',
      version: '0.4.5',
      category: 'integration',
      publisher: 'arsam.net',
      status: 'disabled',
      installedAt: NOW - 365 * DAY,
      permissions: ['ilan.read', 'ilan.write'],
      config: {},
      rating: 3.2,
      installCount: 40,
      changelog: changelog('0.4'),
    },
    {
      id: 'pl-whatsapp-bot',
      name: 'WhatsApp Bot',
      description: 'WhatsApp Business API entegrasyonu. PII redaction güvenlik incelemesinde.',
      version: '0.6.0',
      category: 'integration',
      publisher: 'meta-partner-tr',
      status: 'error',
      installedAt: NOW - 5 * DAY,
      permissions: ['crm.read', 'message.send', 'pii.access'],
      config: { phoneNumberId: '' },
      rating: 3.8,
      installCount: 120,
      changelog: changelog('0.6'),
    },
  ]

  const marketplace: Plugin[] = [
    mkMarket('mp-slack-notify', 'Slack Bildirimleri', 'Önemli eylemler için Slack kanalına otomatik bildirim.', '2.4.0', 'integration', 'Slack', 4.7, 5200, ['webhook.dispatch']),
    mkMarket('mp-google-calendar', 'Google Calendar Sync', 'Randevuları Google Calendar ile çift yönlü senkronize et.', '1.6.1', 'integration', 'Google', 4.5, 3400, ['calendar.read', 'calendar.write']),
    mkMarket('mp-hubspot-sync', 'HubSpot Senkronize', 'CRM kayıtlarını HubSpot ile senkronize et.', '3.0.2', 'crm', 'HubSpot', 4.3, 2100, ['crm.read', 'crm.write']),
    mkMarket('mp-salesforce-bridge', 'Salesforce Köprüsü', 'Salesforce CRM ile veri köprüsü, otomatik senk.', '2.2.0', 'crm', 'Salesforce', 4.1, 980, ['crm.read', 'crm.write']),
    mkMarket('mp-segment-tr', 'Müşteri Segmentleri', 'Müşterileri davranışa göre otomatik segmentle.', '1.4.0', 'crm', 'arsam.net', 4.4, 670, ['crm.read', 'crm.write']),
    mkMarket('mp-mixpanel', 'Mixpanel Analitik', 'Olay bazlı analitik, funnel ve cohort analizi.', '2.1.3', 'analytics', 'Mixpanel', 4.6, 1840, ['analytics.read', 'analytics.write']),
    mkMarket('mp-amplitude', 'Amplitude Analitik', 'Ürün analitik platformu — kullanıcı yolculuğu izleme.', '1.9.0', 'analytics', 'Amplitude', 4.5, 1240, ['analytics.read']),
    mkMarket('mp-ga4', 'Google Analytics 4', 'GA4 ile web ve uygulama analitik entegrasyonu.', '1.2.0', 'analytics', 'Google', 4.2, 3200, ['analytics.read']),
    mkMarket('mp-heatmap-tr', 'Heatmap Pro', 'İlan sayfalarında tıklama ve scroll ısı haritası.', '1.0.5', 'analytics', 'arsam.net', 3.9, 420, ['analytics.read']),
    mkMarket('mp-soc2-monitor', 'SOC 2 İzleme', 'SOC 2 kontrolleri için sürekli izleme ve kanıt toplama.', '1.0.0', 'security', 'arsam.net', 4.8, 320, ['compliance.read', 'audit.write']),
    mkMarket('mp-vault-secrets', 'Sır Kasası', 'API anahtarları ve sırlar için şifrelenmiş kasa.', '2.0.1', 'security', 'arsam.net', 4.9, 1100, ['secret.read', 'secret.write']),
    mkMarket('mp-ip-allowlist', 'IP İzin Listesi', 'Yönetici paneline IP bazlı erişim kontrolü.', '1.1.0', 'security', 'arsam.net', 4.6, 540, ['auth.write']),
    mkMarket('mp-virus-scan', 'Virüs Tarama', 'Yüklenen tüm dosyaları otomatik virüs tarama.', '1.3.0', 'security', 'arsam.net', 4.4, 380, ['storage.read']),
    mkMarket('mp-stripe-billing', 'Stripe Faturalama', 'Stripe ile abonelik ve tek seferlik ödemeler.', '2.5.0', 'integration', 'Stripe', 4.7, 2600, ['billing.read', 'billing.write']),
    mkMarket('mp-twilio-sms', 'Twilio SMS', 'SMS bildirim ve doğrulama — Twilio entegrasyonu.', '1.7.2', 'integration', 'Twilio', 4.5, 1480, ['sms.send']),
    mkMarket('mp-sendgrid-mail', 'SendGrid Mail', 'Transactional e-posta gönderimi için SendGrid.', '1.9.0', 'integration', 'SendGrid', 4.3, 1920, ['email.send']),
    mkMarket('mp-export-pro', 'Veri Dışa Aktarım+', 'Verilerinizi CSV/Excel/JSON formatında zamanlanmış dışa aktar.', '1.5.1', 'utility', 'arsam.net', 4.4, 720, ['data.read', 'storage.write']),
    mkMarket('mp-template-pack', 'Sözleşme Şablonları', '50+ hazır Türkçe sözleşme ve form şablonu.', '1.0.3', 'utility', 'arsam.net', 4.2, 880, ['doc.read', 'doc.write']),
    mkMarket('mp-pdf-generator', 'PDF Üretici', 'Sözleşme ve raporlar için profesyonel PDF üretici.', '2.0.0', 'utility', 'arsam.net', 4.6, 1340, ['doc.write']),
    mkMarket('mp-translation-tr', 'Çeviri Asistanı', '15 dile otomatik metin çevirisi — DeepL motoru.', '1.2.0', 'utility', 'DeepL', 4.5, 410, ['ai.invoke']),
  ]

  return { installed, marketplace }
}

function mkMarket(
  id: string,
  name: string,
  description: string,
  version: string,
  category: PluginCategory,
  publisher: string,
  rating: number,
  installCount: number,
  permissions: string[],
): Plugin {
  return {
    id,
    name,
    description,
    version,
    category,
    publisher,
    status: 'active',
    permissions,
    rating,
    installCount,
    changelog: changelog(version.split('.').slice(0, 2).join('.')),
  }
}

// ─── IO ──────────────────────────────────────────────────────────────────────

// Cached snapshot — keeps getInstalledPlugins / getMarketplacePlugins
// referentially stable between writes. Required for useSyncExternalStore
// (otherwise React throws #185 from an infinite re-render loop).
let cache: StoreShape | null = null
let installedSnapshot: Plugin[] | null = null
let marketplaceSnapshot: Plugin[] | null = null

function invalidate(): void {
  cache = null
  installedSnapshot = null
  marketplaceSnapshot = null
}

function read(): StoreShape {
  if (cache) return cache
  if (typeof window === 'undefined') {
    cache = seed()
    return cache
  }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      const s = seed()
      write(s)
      cache = s
      return s
    }
    const parsed = JSON.parse(raw) as Partial<StoreShape> | null
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.installed) || !Array.isArray(parsed.marketplace)) {
      const s = seed()
      write(s)
      cache = s
      return s
    }
    cache = { installed: parsed.installed, marketplace: parsed.marketplace }
    return cache
  } catch {
    cache = seed()
    return cache
  }
}

function write(next: StoreShape): void {
  cache = next
  installedSnapshot = null
  marketplaceSnapshot = null
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* quota / privacy mode — swallow */
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getInstalledPlugins(): Plugin[] {
  if (installedSnapshot) return installedSnapshot
  installedSnapshot = read().installed
  return installedSnapshot
}

export function getMarketplacePlugins(): Plugin[] {
  if (marketplaceSnapshot) return marketplaceSnapshot
  const { installed, marketplace } = read()
  const installedIds = new Set(installed.map((p) => p.id))
  // Filter out plugins that are already installed (dedupe by id).
  marketplaceSnapshot = marketplace.filter((p) => !installedIds.has(p.id))
  return marketplaceSnapshot
}

export function getPlugin(id: string): Plugin | undefined {
  const { installed, marketplace } = read()
  return installed.find((p) => p.id === id) ?? marketplace.find((p) => p.id === id)
}

/**
 * Install async simulation:
 *   1. Move from marketplace → installed list with status='installing'
 *   2. setTimeout 1000ms → flip to status='active', set installedAt
 *   3. Dispatch event on each transition.
 *
 * Duplicate prevention: if already installed, throws.
 */
export function installPlugin(id: string): Plugin {
  const state = read()
  if (state.installed.some((p) => p.id === id)) {
    throw new Error(`Plugin already installed: ${id}`)
  }
  const source = state.marketplace.find((p) => p.id === id)
  if (!source) {
    throw new Error(`Plugin not found in marketplace: ${id}`)
  }
  const installing: Plugin = { ...source, status: 'installing', installedAt: Date.now() }
  const next: StoreShape = {
    installed: [...state.installed, installing],
    marketplace: state.marketplace.filter((p) => p.id !== id),
  }
  write(next)

  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      const current = read()
      const idx = current.installed.findIndex((p) => p.id === id)
      if (idx === -1) return
      const updated = { ...current.installed[idx], status: 'active' as PluginStatus, installedAt: Date.now() }
      const nextState: StoreShape = {
        installed: [...current.installed.slice(0, idx), updated, ...current.installed.slice(idx + 1)],
        marketplace: current.marketplace,
      }
      write(nextState)
    }, INSTALL_DELAY_MS)
  }
  return installing
}

/**
 * Uninstall — moves plugin back to marketplace (loses installedAt + config).
 */
export function uninstallPlugin(id: string): void {
  const state = read()
  const installed = state.installed.find((p) => p.id === id)
  if (!installed) return
  const restored: Plugin = { ...installed, status: 'active', config: undefined, installedAt: undefined }
  const next: StoreShape = {
    installed: state.installed.filter((p) => p.id !== id),
    marketplace: state.marketplace.some((p) => p.id === id)
      ? state.marketplace
      : [...state.marketplace, restored],
  }
  write(next)
}

export function updatePluginConfig(id: string, config: Record<string, unknown>): Plugin | undefined {
  const state = read()
  const idx = state.installed.findIndex((p) => p.id === id)
  if (idx === -1) return undefined
  const updated: Plugin = { ...state.installed[idx], config }
  const next: StoreShape = {
    installed: [...state.installed.slice(0, idx), updated, ...state.installed.slice(idx + 1)],
    marketplace: state.marketplace,
  }
  write(next)
  return updated
}

export function setPluginStatus(id: string, status: PluginStatus): Plugin | undefined {
  const state = read()
  const idx = state.installed.findIndex((p) => p.id === id)
  if (idx === -1) return undefined
  const updated: Plugin = { ...state.installed[idx], status }
  const next: StoreShape = {
    installed: [...state.installed.slice(0, idx), updated, ...state.installed.slice(idx + 1)],
    marketplace: state.marketplace,
  }
  write(next)
  return updated
}

export function subscribePlugins(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e?: Event) => {
    // Cross-tab storage events need to drop the cached snapshot too.
    if (e?.type === 'storage') invalidate()
    cb()
  }
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

/** Test-only: clear store + reseed. Production code shouldn't call. */
export function resetPluginsForTests(): void {
  invalidate()
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* sessionStorage / localStorage may be replaced by test shim */
  }
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export const CATEGORY_LABEL: Record<PluginCategory, string> = {
  analytics: 'Analitik',
  integration: 'Entegrasyon',
  crm: 'CRM',
  security: 'Güvenlik',
  utility: 'Yardımcı',
}

export const STATUS_LABEL: Record<PluginStatus, string> = {
  active: 'Aktif',
  disabled: 'Devre dışı',
  error: 'Hata',
  installing: 'Yükleniyor',
  updating: 'Güncelleniyor',
}

export const PERMISSION_LABEL: Record<string, string> = {
  'ilan.read': 'İlanları okuma',
  'ilan.write': 'İlanları düzenleme',
  'webhook.dispatch': 'Webhook tetikleme',
  'ai.invoke': 'AI motorunu çalıştırma',
  'crm.read': 'CRM kayıtlarını okuma',
  'crm.write': 'CRM kayıtlarını düzenleme',
  'doc.read': 'Belgeleri okuma',
  'doc.write': 'Belge oluşturma',
  'analytics.read': 'Analitik verilerini okuma',
  'analytics.write': 'Analitik verisi yazma',
  'compliance.read': 'Uyum verilerini okuma',
  'compliance.write': 'Uyum verilerini düzenleme',
  'audit.write': 'Denetim kaydı oluşturma',
  'auth.write': 'Kimlik doğrulama ayarları',
  'user.write': 'Kullanıcı yönetimi',
  'email.send': 'E-posta gönderme',
  'sms.send': 'SMS gönderme',
  'message.send': 'Mesaj gönderme',
  'pii.access': 'Kişisel verilere erişim',
  'storage.read': 'Depolama okuma',
  'storage.write': 'Depolama yazma',
  'calendar.read': 'Takvim okuma',
  'calendar.write': 'Takvim düzenleme',
  'billing.read': 'Faturalama okuma',
  'billing.write': 'Faturalama yazma',
  'secret.read': 'Sır okuma',
  'secret.write': 'Sır yazma',
  'data.read': 'Veri okuma',
}

export function labelPermission(perm: string): string {
  return PERMISSION_LABEL[perm] ?? perm
}
