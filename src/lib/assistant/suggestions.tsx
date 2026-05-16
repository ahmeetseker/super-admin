import { Coins, Building2, Activity, Flag } from '@landx/icons'
import type { AiSuggestion } from '@landx/ui/shell'

export const OPS_AI_SUGGESTIONS: AiSuggestion[] = [
  { label: 'Geçen ay LLM cost', icon: <Coins className="h-3 w-3" /> },
  { label: 'Bu hafta yeni tenant', icon: <Building2 className="h-3 w-3" /> },
  { label: 'Son 24h hata oranı', icon: <Activity className="h-3 w-3" /> },
  { label: 'Aktif feature flag', icon: <Flag className="h-3 w-3" /> },
]

export const OPS_AI_STAGES = [
  'Sorgun yorumlanıyor…',
  'Telemetri taranıyor…',
  'Sonuç toplanıyor…',
] as const
