import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  Shield,
  LayoutGrid,
  Building2,
  Activity,
  ShieldCheck,
  Settings,
  CreditCard,
  TrendingUp,
  Users,
  Coins,
  Plug,
  Wrench,
  Brain,
  Database,
  Send,
  FileCode,
  MessagesSquare,
  Flag,
  Languages,
  FlaskConical,
  FileText,
  Lock,
  BadgeCheck,
} from '@landx/icons'
import { DynamicIslandHeader, type SubNavItem } from '@landx/ui/shell'
import { opsAnswer } from '@/lib/assistant/answer'
import { OPS_AI_SUGGESTIONS, OPS_AI_STAGES } from '@/lib/assistant/suggestions'

type GroupKey = 'overview' | 'musteriler' | 'telemetri' | 'ai-layer' | 'entegrasyon' | 'guvenlik'

interface OpsNavRecord {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: GroupKey
}

const OPS_NAV: ReadonlyArray<OpsNavRecord> = [
  { to: '/',              label: 'Overview',      icon: LayoutGrid,     group: 'overview' },
  { to: '/settings',      label: 'Settings',      icon: Settings,       group: 'overview' },
  { to: '/tenants',       label: 'Tenants',       icon: Building2,      group: 'musteriler' },
  { to: '/plans',         label: 'Plans',         icon: CreditCard,     group: 'musteriler' },
  { to: '/revenue',       label: 'Revenue',       icon: TrendingUp,     group: 'musteriler' },
  { to: '/cohorts',       label: 'Cohorts',       icon: Users,          group: 'musteriler' },
  { to: '/observability', label: 'Observability', icon: Activity,       group: 'telemetri' },
  { to: '/llm-cost',      label: 'LLM Cost',      icon: Coins,          group: 'telemetri' },
  { to: '/plugins',       label: 'Plugins',       icon: Plug,           group: 'entegrasyon' },
  { to: '/mcp-tools',     label: 'MCP Tools',     icon: Wrench,         group: 'ai-layer' },
  { to: '/memory-layer',  label: 'Memory Layer',  icon: Brain,          group: 'ai-layer' },
  { to: '/vector-store',  label: 'Vector Store',  icon: Database,       group: 'ai-layer' },
  { to: '/webhooks',      label: 'Webhooks',      icon: Send,           group: 'entegrasyon' },
  { to: '/prompts',       label: 'Prompts',       icon: FileCode,       group: 'ai-layer' },
  { to: '/sessions',      label: 'Sessions',      icon: MessagesSquare, group: 'ai-layer' },
  { to: '/feature-flags', label: 'Feature Flags', icon: Flag,           group: 'entegrasyon' },
  { to: '/i18n',          label: 'i18n',          icon: Languages,      group: 'entegrasyon' },
  { to: '/experiments',   label: 'Experiments',   icon: FlaskConical,   group: 'entegrasyon' },
  { to: '/audit',         label: 'Audit Log',     icon: FileText,       group: 'guvenlik' },
  { to: '/pii',           label: 'PII Access',    icon: Lock,           group: 'guvenlik' },
  { to: '/permissions',   label: 'Permissions',   icon: Shield,         group: 'guvenlik' },
  { to: '/compliance',    label: 'Compliance',    icon: BadgeCheck,     group: 'guvenlik' },
  { to: '/operators',     label: 'Operators',     icon: Users,          group: 'guvenlik' },
  { to: '/security',      label: 'Security',      icon: ShieldCheck,    group: 'guvenlik' },
  { to: '/data-rights',   label: 'Data Rights',   icon: FileText,       group: 'guvenlik' },
]

function buildSubNav(): Record<GroupKey, SubNavItem[]> {
  const result: Record<GroupKey, SubNavItem[]> = {
    overview: [],
    musteriler: [],
    telemetri: [],
    'ai-layer': [],
    entegrasyon: [],
    guvenlik: [],
  }
  for (const n of OPS_NAV) {
    const Icon = n.icon
    result[n.group].push({
      key: n.to,
      label: n.label,
      icon: <Icon className="h-5 w-5" />,
      target: n.group,
      href: n.to,
    })
  }
  return result
}

function deriveActiveGroup(pathname: string): GroupKey {
  // Sort by `to` descending so longer prefixes match first (e.g. /llm-cost
  // before /). The root '/' should only match exact root, not any subroute.
  const sorted = [...OPS_NAV].sort((a, b) => b.to.length - a.to.length)
  const match = sorted.find((n) => {
    if (n.to === '/') return pathname === '/'
    return pathname === n.to || pathname.startsWith(`${n.to}/`)
  })
  return match?.group ?? 'overview'
}

interface OpsDynamicIslandHeaderProps {
  onOpenAssistant?: () => void
}

export function OpsDynamicIslandHeader({ onOpenAssistant }: OpsDynamicIslandHeaderProps = {}) {
  const location = useLocation()
  const navigate = useNavigate()
  const subNav = useMemo(buildSubNav, [])

  return (
    <DynamicIslandHeader
      brandIcon={<Shield className="h-6 w-6 flex-none" />}
      brandLabel="LandX"
      activeKey={deriveActiveGroup(location.pathname)}
      navPages={[
        { key: 'overview',    alt: 'Overview',    icon: <LayoutGrid className="h-5 w-5" /> },
        { key: 'musteriler',  alt: 'Müşteriler',  icon: <Building2 className="h-5 w-5" /> },
        { key: 'telemetri',   alt: 'Telemetri',   icon: <Activity className="h-5 w-5" /> },
        { key: 'ai-layer',    alt: 'AI Layer',    icon: <Brain className="h-5 w-5" /> },
        { key: 'entegrasyon', alt: 'Entegrasyon', icon: <Plug className="h-5 w-5" /> },
        { key: 'guvenlik',    alt: 'Güvenlik',    icon: <ShieldCheck className="h-5 w-5" /> },
      ]}
      subNav={subNav}
      aiSearch={{
        placeholder: "Operatör sorusu... örn. 'Geçen ay LLM cost?'",
        suggestions: OPS_AI_SUGGESTIONS,
        answerFn: opsAnswer,
        stageLabels: OPS_AI_STAGES,
      }}
      notifications={{
        unreadCount: 0,
        panel: (
          <div className="w-72 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-xl">
            Bildirim sistemi henüz aktif değil.
          </div>
        ),
      }}
      onOpenAssistant={onOpenAssistant}
      onNavigateHref={(href) => navigate(href)}
    />
  )
}
