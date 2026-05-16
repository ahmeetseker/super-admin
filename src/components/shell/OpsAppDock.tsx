import { useNavigate } from 'react-router'
import {
  LayoutGrid,
  Building2,
  CreditCard,
  TrendingUp,
  Activity,
  Coins,
  FileText,
  Send,
  Settings,
  Users,
  ClipboardCheck,
  Zap,
  BarChart3,
  MapPinned,
} from '@landx/icons'
import { MorphDock } from '@landx/ui/primitives'
import type { DockIcon } from '@landx/ui/primitives'

export function OpsAppDock() {
  const navigate = useNavigate()

  const icons: DockIcon[] = [
    { alt: 'Overview',      label: 'Overview',      icon: <LayoutGrid className="size-5" />,      onClick: () => navigate('/') },
    { alt: 'Approvals',     label: 'Approvals',     icon: <ClipboardCheck className="size-5" />,  onClick: () => navigate('/approvals') },
    { alt: 'Rules',         label: 'Rules',         icon: <Zap className="size-5" />,             onClick: () => navigate('/rules') },
    { alt: 'TKGM',          label: 'TKGM',          icon: <MapPinned className="size-5" />,       onClick: () => navigate('/tkgm') },
    { alt: 'Tenants',       label: 'Tenants',       icon: <Building2 className="size-5" />,       onClick: () => navigate('/tenants') },
    { alt: 'Plans',         label: 'Plans',         icon: <CreditCard className="size-5" />,      onClick: () => navigate('/plans') },
    { alt: 'Revenue',       label: 'Revenue',       icon: <TrendingUp className="size-5" />,      onClick: () => navigate('/revenue') },
    { alt: 'Reports',       label: 'Reports',       icon: <BarChart3 className="size-5" />,       onClick: () => navigate('/reports') },
    { alt: 'Observability', label: 'Observability', icon: <Activity className="size-5" />,        onClick: () => navigate('/observability') },
    { alt: 'LLM Cost',      label: 'LLM Cost',      icon: <Coins className="size-5" />,           onClick: () => navigate('/llm-cost') },
    { alt: 'Audit',         label: 'Audit',         icon: <FileText className="size-5" />,        onClick: () => navigate('/audit') },
    { alt: 'Webhooks',      label: 'Webhooks',      icon: <Send className="size-5" />,            onClick: () => navigate('/webhooks') },
    { alt: 'Settings',      label: 'Settings',      icon: <Settings className="size-5" />,        onClick: () => navigate('/settings') },
    { alt: 'Operators',     label: 'Operators',     icon: <Users className="size-5" />,           onClick: () => navigate('/operators') },
  ]

  return <MorphDock icons={icons} orientation="horizontal" />
}
