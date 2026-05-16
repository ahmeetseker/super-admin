import {
  Activity,
  Boxes,
  Brain,
  Building2,
  Coins,
  Database,
  FileText,
  Layers,
  LayoutDashboard,
  Moon,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Webhook,
  type LucideIcon,
} from '@landx/icons'
import { TENANTS, AUDIT_LOG } from '@landx/data'
import { getPlans } from '@/lib/platform-plans'
import { getInstalledPlugins } from '@/lib/platform-plugins'
import { getEndpoints } from '@/lib/platform-webhooks'

export type PaletteItemType =
  | 'action'
  | 'page'
  | 'tenant'
  | 'plan'
  | 'plugin'
  | 'webhook'
  | 'audit'

export interface PaletteItem {
  id: string
  type: PaletteItemType
  label: string
  hint?: string
  shortcut?: string
  Icon: LucideIcon
  to?: string
  action?: () => void
}

export const RECENT_STORAGE_KEY = 'arsam.super-command-palette.recent.v1'
const RECENT_LIMIT = 5

export const ACTIONS: ReadonlyArray<PaletteItem> = [
  {
    id: 'new-tenant',
    type: 'action',
    label: 'Yeni tenant oluştur',
    hint: 'Tenants · Yeni',
    to: '/tenants/new',
    Icon: Plus,
  },
  {
    id: 'open-plans',
    type: 'action',
    label: 'Plan yönetimi',
    hint: 'CRUD · Free/Pro/Enterprise',
    to: '/plans',
    Icon: Coins,
  },
  {
    id: 'open-webhooks',
    type: 'action',
    label: 'Webhook ekle',
    hint: 'Endpoint + events',
    to: '/webhooks',
    Icon: Webhook,
  },
  {
    id: 'open-audit',
    type: 'action',
    label: 'Audit log incele',
    hint: 'Filter + export',
    to: '/audit',
    Icon: ShieldCheck,
  },
  {
    id: 'open-settings',
    type: 'action',
    label: 'Platform ayarları',
    to: '/settings',
    Icon: SettingsIcon,
  },
  {
    id: 'open-theme',
    type: 'action',
    label: 'Tema değiştir',
    hint: 'Ayarlar · Görünüm',
    to: '/settings#appearance',
    Icon: Moon,
  },
]

export const PAGES: ReadonlyArray<PaletteItem> = [
  { id: 'page-overview', type: 'page', label: 'Overview', to: '/', shortcut: 'g o', Icon: LayoutDashboard },
  { id: 'page-tenants', type: 'page', label: 'Tenants', to: '/tenants', shortcut: 'g t', Icon: Building2 },
  { id: 'page-plans', type: 'page', label: 'Plans', to: '/plans', shortcut: 'g p', Icon: Coins },
  { id: 'page-audit', type: 'page', label: 'Audit log', to: '/audit', shortcut: 'g l', Icon: ShieldCheck },
  { id: 'page-web-vitals', type: 'page', label: 'Web Vitals', to: '/web-vitals', shortcut: 'g v', Icon: Activity },
  { id: 'page-observability', type: 'page', label: 'Observability', to: '/observability', Icon: TrendingUp },
  { id: 'page-llm-cost', type: 'page', label: 'LLM cost', to: '/llm-cost', Icon: Sparkles },
  { id: 'page-sessions', type: 'page', label: 'Sessions', to: '/sessions', Icon: Users },
  { id: 'page-mcp-tools', type: 'page', label: 'MCP tools', to: '/mcp-tools', Icon: Boxes },
  { id: 'page-prompts', type: 'page', label: 'Prompts', to: '/prompts', Icon: FileText },
  { id: 'page-memory', type: 'page', label: 'Memory layer', to: '/memory-layer', Icon: Brain },
  { id: 'page-vector', type: 'page', label: 'Vector store', to: '/vector-store', Icon: Database },
  { id: 'page-plugins', type: 'page', label: 'Plugins', to: '/plugins', Icon: Layers },
  { id: 'page-webhooks', type: 'page', label: 'Webhooks', to: '/webhooks', Icon: Webhook },
  { id: 'page-compliance', type: 'page', label: 'Compliance', to: '/compliance', Icon: ShieldCheck },
  { id: 'page-pii', type: 'page', label: 'PII', to: '/pii', Icon: ShieldCheck },
  { id: 'page-permissions', type: 'page', label: 'Permissions', to: '/permissions', Icon: ShieldCheck },
]

function includesCI(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase('tr-TR').includes(needle.toLocaleLowerCase('tr-TR'))
}

const ENTITY_LIMIT = 5

export function searchEntities(query: string): PaletteItem[] {
  if (!query.trim()) return []
  const q = query.trim()
  const out: PaletteItem[] = []

  let count = 0
  for (const t of TENANTS) {
    if (count >= ENTITY_LIMIT) break
    if (includesCI(t.name, q) || includesCI(t.city, q) || includesCI(t.id, q)) {
      out.push({
        id: `tenant-${t.id}`,
        type: 'tenant',
        label: t.name,
        hint: `${t.plan} · ${t.status} · ${t.city}`,
        to: `/tenants/${t.id}`,
        Icon: Building2,
      })
      count++
    }
  }

  count = 0
  try {
    for (const p of getPlans()) {
      if (count >= ENTITY_LIMIT) break
      if (includesCI(p.name, q) || includesCI(p.tier, q)) {
        out.push({
          id: `plan-${p.id}`,
          type: 'plan',
          label: p.name,
          hint: `${p.tier} · ${p.priceMonthly} TL/ay`,
          to: `/plans`,
          Icon: Coins,
        })
        count++
      }
    }
  } catch {
    /* storage unavailable in SSR */
  }

  count = 0
  try {
    for (const p of getInstalledPlugins()) {
      if (count >= ENTITY_LIMIT) break
      if (includesCI(p.name, q) || includesCI(p.publisher, q)) {
        out.push({
          id: `plugin-${p.id}`,
          type: 'plugin',
          label: p.name,
          hint: `${p.category} · ${p.publisher}`,
          to: `/plugins`,
          Icon: Layers,
        })
        count++
      }
    }
  } catch {
    /* ignore */
  }

  count = 0
  try {
    for (const e of getEndpoints()) {
      if (count >= ENTITY_LIMIT) break
      if (includesCI(e.url, q)) {
        out.push({
          id: `webhook-${e.id}`,
          type: 'webhook',
          label: e.url,
          hint: `${e.status} · ${e.events.length} event`,
          to: `/webhooks`,
          Icon: Webhook,
        })
        count++
      }
    }
  } catch {
    /* ignore */
  }

  count = 0
  for (const a of AUDIT_LOG) {
    if (count >= ENTITY_LIMIT) break
    const hay = `${a.action} ${a.actor} ${a.resourceType} ${a.outcome}`
    if (includesCI(hay, q)) {
      out.push({
        id: `audit-${a.id}`,
        type: 'audit',
        label: `${a.action} · ${a.resourceType}`,
        hint: `${a.actor} · ${a.outcome}`,
        to: `/audit`,
        Icon: ShieldCheck,
      })
      count++
    }
  }

  return out
}

export function readRecent(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

export function pushRecent(query: string): string[] {
  const q = query.trim()
  if (!q) return readRecent()
  const current = readRecent()
  const next = [q, ...current.filter((v) => v !== q)].slice(0, RECENT_LIMIT)
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(RECENT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export interface FlatPaletteSection {
  label: string
  items: ReadonlyArray<PaletteItem>
}

export function filteredSections(query: string): FlatPaletteSection[] {
  if (!query.trim()) {
    return [
      { label: 'AKSİYONLAR', items: ACTIONS },
      { label: 'SAYFALAR', items: PAGES },
    ]
  }
  const q = query.trim().toLocaleLowerCase('tr-TR')
  const matchAction = ACTIONS.filter((a) => a.label.toLocaleLowerCase('tr-TR').includes(q))
  const matchPage = PAGES.filter((p) => p.label.toLocaleLowerCase('tr-TR').includes(q))
  const entities = searchEntities(query)
  const sections: FlatPaletteSection[] = []
  if (matchAction.length) sections.push({ label: 'AKSİYONLAR', items: matchAction })
  if (matchPage.length) sections.push({ label: 'SAYFALAR', items: matchPage })
  if (entities.length) sections.push({ label: 'SONUÇLAR', items: entities })
  return sections
}
