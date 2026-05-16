// Wave F12.A — LLM cost KPI cards.
import { Coins, Cpu, Layers, TrendingUp } from '@landx/icons'
import { type LlmCostKpis, MODEL_LABEL } from '@/lib/platform-llm-cost'

const TL_FMT = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 })
const COUNT_FMT = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 })

export interface KpiCardsProps {
  kpis: LlmCostKpis
}

export default function KpiCards({ kpis }: KpiCardsProps) {
  const topModelLabel = kpis.topModel ? MODEL_LABEL[kpis.topModel] : 'veri yok'

  return (
    <section
      className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
      data-testid="llm-cost-kpi-cards"
    >
      <Card
        icon={Coins}
        label="Toplam maliyet"
        value={TL_FMT.format(kpis.totalCostTL)}
        hint="seçili aralık"
        testId="llm-kpi-total-cost"
      />
      <Card
        icon={Layers}
        label="Toplam çağrı"
        value={COUNT_FMT.format(kpis.totalCalls)}
        hint={`${kpis.totalCalls} kayıt`}
        testId="llm-kpi-total-calls"
      />
      <Card
        icon={TrendingUp}
        label="Çağrı başı ort."
        value={TL_FMT.format(kpis.avgCostPerCallTL)}
        hint="₺ / çağrı"
        testId="llm-kpi-avg-cost"
      />
      <Card
        icon={Cpu}
        label="En pahalı model"
        value={topModelLabel}
        hint={kpis.topModel ? 'toplam ₺ bazında' : ''}
        testId="llm-kpi-top-model"
      />
    </section>
  )
}

function Card({
  icon: Icon,
  label,
  value,
  hint,
  testId,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
  testId: string
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4" data-testid={testId}>
      <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/[0.06]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}
