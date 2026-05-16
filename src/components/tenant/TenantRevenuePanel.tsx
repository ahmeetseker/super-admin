// Wave F20.A — TenantRevenuePanel
//
// "Gelir" tab on /tenants/:id. Vanilla-SVG 12-ay MRR bar sparkline (F12 paterni
// — recharts yok), plan badge, monthly price, churn-risk uyarısı ve annual
// projection. Per-tenant series tenant.mrr + createdISO + status üzerinden
// deterministically türetilir, böylece test snapshot'ları sabit kalır.

import { useMemo } from 'react'
import { Coins, TrendingDown, TrendingUp } from '@landx/icons'
import type { Tenant } from '@landx/data'
import { cn, formatTL, formatTLCompact } from '@landx/ui'
import { getTenantHealth } from '@/lib/super-admin-tenant-analytics'

export interface TenantRevenuePanelProps {
  tenant: Tenant
  now?: number
}

interface MonthBar {
  label: string // MMM (Tem, Ağu...)
  monthKey: string // YYYY-MM
  mrr: number
  active: boolean
}

const TR_MONTHS_SHORT = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
]

function parseISO(iso: string): number {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? Date.now() : t
}

/**
 * 12-month per-tenant MRR history. Pre-createdISO months → 0. Post-churn (status
 * 'Churned' veya 'Askıda', son aktiviteden sonra) → 0. Aktif aylarda küçük
 * deterministik dalgalanma (mrr * (1 ± 0.05)) — gerçek billing data gelince
 * bu fonksiyon swap edilir.
 */
export function buildMrrSeries(tenant: Tenant, now = Date.now(), months = 12): MonthBar[] {
  const created = parseISO(tenant.createdISO)
  const lastActive = parseISO(tenant.lastActiveISO)
  const isChurned = tenant.status === 'Churned' || tenant.status === 'Askıda'

  const start = new Date(now)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  start.setMonth(start.getMonth() - (months - 1))

  const out: MonthBar[] = []
  for (let i = 0; i < months; i++) {
    const m = new Date(start)
    m.setMonth(start.getMonth() + i)
    const monthStart = m.getTime()
    const monthEnd = new Date(m.getFullYear(), m.getMonth() + 1, 1).getTime()

    let mrr = 0
    let active = false
    if (created < monthEnd) {
      const churnedThisMonth = isChurned && lastActive < monthEnd
      if (!churnedThisMonth || (isChurned && lastActive >= monthStart)) {
        // Deterministic wobble — phase keyed off month index.
        const phase = (i + (tenant.id.charCodeAt(0) % 12)) / 12
        const wobble = 1 + Math.sin(phase * Math.PI * 2) * 0.05
        mrr = Math.round(tenant.mrr * wobble)
        active = mrr > 0
      }
    }
    out.push({
      label: TR_MONTHS_SHORT[m.getMonth()],
      monthKey: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`,
      mrr,
      active,
    })
  }
  return out
}

const PLAN_PRICE: Record<Tenant['plan'], number> = {
  Free: 0,
  Pro: 4_900,
  Enterprise: 14_900,
}

const PLAN_BADGE: Record<Tenant['plan'], string> = {
  Free: 'bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20',
  Pro: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
  Enterprise: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
}

const CHART_W = 560
const CHART_H = 140
const PAD = { top: 12, right: 8, bottom: 24, left: 8 }

export function TenantRevenuePanel({ tenant, now = Date.now() }: TenantRevenuePanelProps) {
  const series = useMemo(() => buildMrrSeries(tenant, now, 12), [tenant, now])
  const health = useMemo(() => getTenantHealth(tenant, now), [tenant, now])

  const maxMrr = series.reduce((m, p) => Math.max(m, p.mrr), 0) || 1
  const lastMrr = series[series.length - 1]?.mrr ?? 0
  const prevMrr = series[series.length - 2]?.mrr ?? 0
  const trend = lastMrr - prevMrr

  const totalAnnualMrr = series.reduce((s, p) => s + p.mrr, 0)
  const annualProjection = tenant.mrr * 12

  const innerW = CHART_W - PAD.left - PAD.right
  const innerH = CHART_H - PAD.top - PAD.bottom
  const barGap = 4
  const barWidth = Math.max(2, (innerW - barGap * (series.length - 1)) / series.length)

  const churnRisk = health.tier === 'critical' || tenant.status === 'Churned' || tenant.status === 'Askıda'

  return (
    <section data-testid="tenant-revenue-panel" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <article className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                MRR · 12 AYLIK GEÇMİŞ
              </div>
              <h3 className="font-serif text-lg font-medium">
                {tenant.mrr > 0 ? formatTL(tenant.mrr) : '— ücretsiz'}{' '}
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  / ay
                </span>
              </h3>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]',
                trend > 0
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : trend < 0
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    : 'border-border bg-card text-muted-foreground',
              )}
              data-testid="revenue-trend-badge"
            >
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3" aria-hidden />
              ) : trend < 0 ? (
                <TrendingDown className="h-3 w-3" aria-hidden />
              ) : null}
              {trend === 0 ? 'sabit' : `${trend > 0 ? '+' : ''}${formatTLCompact(trend)}`}
            </span>
          </header>

          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            role="img"
            aria-label="12 aylık MRR sparkline"
            className="w-full text-foreground"
            data-testid="revenue-sparkline"
          >
            <rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="currentColor"
              className="text-foreground/[0.02]"
            />
            {series.map((pt, i) => {
              const h = pt.mrr > 0 ? Math.max(2, (pt.mrr / maxMrr) * innerH) : 0
              const x = PAD.left + i * (barWidth + barGap)
              const y = PAD.top + (innerH - h)
              const isLatest = i === series.length - 1
              return (
                <g key={pt.monthKey}>
                  {h > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={h}
                      rx={2}
                      fill="currentColor"
                      className={cn(
                        isLatest ? 'text-foreground' : 'text-foreground/40',
                      )}
                      data-testid={`revenue-bar-${pt.monthKey}`}
                    >
                      <title>{`${pt.label}: ${formatTL(pt.mrr)}`}</title>
                    </rect>
                  )}
                  <text
                    x={x + barWidth / 2}
                    y={CHART_H - PAD.bottom + 14}
                    textAnchor="middle"
                    className="fill-current font-mono text-[9px] text-muted-foreground"
                  >
                    {pt.label}
                  </text>
                </g>
              )
            })}
          </svg>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3 border-t border-border/60 pt-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              fatura edilen toplam (12 ay)
            </span>
            <span className="font-serif text-base tabular-nums">
              {formatTL(totalAnnualMrr)}
            </span>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-border bg-card p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              PLAN
            </div>
            <span
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em]',
                PLAN_BADGE[tenant.plan],
              )}
              data-testid="revenue-plan-badge"
            >
              <Coins className="h-3 w-3" aria-hidden />
              {tenant.plan}
            </span>
            <dl className="mt-3 space-y-2 text-[12.5px]">
              <Row label="Aylık" value={tenant.mrr > 0 ? formatTL(tenant.mrr) : '—'} />
              <Row label="Liste fiyatı" value={formatTL(PLAN_PRICE[tenant.plan])} />
              <Row label="Yıllık projeksiyon" value={formatTL(annualProjection)} />
            </dl>
          </article>

          {churnRisk && (
            <article
              className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] p-5"
              data-testid="revenue-churn-warning"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose-700 dark:text-rose-300">
                CHURN RİSKİ
              </div>
              <h3 className="mt-1 font-serif text-base font-medium">
                {tenant.status === 'Churned'
                  ? 'Hesap kapatıldı'
                  : tenant.status === 'Askıda'
                    ? 'Hesap askıda — billing duraklatıldı'
                    : 'Sağlık skoru kritik'}
              </h3>
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                {health.recommendation ?? 'Müşteri başarı ekibinden temas önerilir.'}
              </p>
            </article>
          )}
        </aside>
      </div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  )
}

export default TenantRevenuePanel
