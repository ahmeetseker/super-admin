// Wave F20.A — TenantHealthPanel
//
// "Sağlık" tab on /tenants/:id. Score gauge (vanilla SVG semicircle), tier
// badge (F20.0 helpers), signals list with weighted +/- breakdown, and an
// optional recommendation card. All data sourced from `getTenantHealth` —
// component is pure render.

import { useMemo } from 'react'
import { Activity } from '@landx/icons'
import type { Tenant } from '@landx/data'
import { cn } from '@landx/ui'
import {
  getTenantHealth,
  tierBadgeClass,
  tierLabel,
  type TenantHealth,
} from '@/lib/super-admin-tenant-analytics'

export interface TenantHealthPanelProps {
  tenant: Tenant
  now?: number
}

const GAUGE_W = 240
const GAUGE_H = 140
const GAUGE_CX = GAUGE_W / 2
const GAUGE_CY = GAUGE_H - 16
const GAUGE_R = 96
const GAUGE_STROKE = 14

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polar(cx, cy, r, endDeg)
  const end = polar(cx, cy, r, startDeg)
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 180) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function gaugeToneClass(tier: TenantHealth['tier']): string {
  if (tier === 'healthy') return 'text-emerald-500'
  if (tier === 'at-risk') return 'text-amber-500'
  return 'text-rose-500'
}

export function TenantHealthPanel({ tenant, now = Date.now() }: TenantHealthPanelProps) {
  const health = useMemo(() => getTenantHealth(tenant, now), [tenant, now])
  const { score, tier, signals, recommendation } = health

  // Semicircle: 0° (left) → 180° (right). Score 0..100 maps linearly.
  const scoreDeg = Math.max(0, Math.min(180, (score / 100) * 180))

  const positive = signals.filter((s) => s.weight > 0)
  const negative = signals.filter((s) => s.weight < 0)

  return (
    <section data-testid="tenant-health-panel" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <article className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              SAĞLIK SKORU
            </div>
            <h3 className="font-serif text-lg font-medium">0 — 100 arası</h3>
          </header>

          <div className="flex flex-col items-center">
            <svg
              viewBox={`0 0 ${GAUGE_W} ${GAUGE_H}`}
              role="img"
              aria-label={`Sağlık skoru ${score} / 100, ${tierLabel(tier)}`}
              className="w-full max-w-[280px]"
              data-testid="health-gauge"
            >
              {/* Track */}
              <path
                d={describeArc(GAUGE_CX, GAUGE_CY, GAUGE_R, 0, 180)}
                fill="none"
                stroke="currentColor"
                strokeWidth={GAUGE_STROKE}
                strokeLinecap="round"
                className="text-foreground/[0.08]"
              />
              {/* Fill */}
              {score > 0 && (
                <path
                  d={describeArc(GAUGE_CX, GAUGE_CY, GAUGE_R, 0, scoreDeg)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={GAUGE_STROKE}
                  strokeLinecap="round"
                  className={gaugeToneClass(tier)}
                  data-testid="health-gauge-fill"
                />
              )}
              {/* Score label */}
              <text
                x={GAUGE_CX}
                y={GAUGE_CY - 16}
                textAnchor="middle"
                className="fill-current font-serif text-[36px] font-light tabular-nums text-foreground"
              >
                {score}
              </text>
              <text
                x={GAUGE_CX}
                y={GAUGE_CY + 4}
                textAnchor="middle"
                className="fill-current font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground"
              >
                / 100
              </text>
            </svg>

            <span
              className={cn(
                'mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]',
                tierBadgeClass(tier),
              )}
              data-testid="health-tier-badge"
              data-tier={tier}
            >
              <Activity className="h-3 w-3" aria-hidden />
              {tierLabel(tier)}
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              SİNYALLER
            </div>
            <h3 className="font-serif text-base font-medium">
              {signals.length} kayıt · +{positive.reduce((s, x) => s + x.weight, 0)} /{' '}
              {negative.reduce((s, x) => s + x.weight, 0)}
            </h3>
          </header>
          <ul className="space-y-1.5" data-testid="health-signals-list">
            {signals.map((s, i) => (
              <li
                key={`${s.label}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-[12.5px]"
                data-testid="health-signal-row"
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-1.5 w-1.5 flex-none rounded-full',
                    s.weight > 0 ? 'bg-emerald-500' : 'bg-rose-500',
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <span
                  className={cn(
                    'flex-none font-mono text-[11px] tabular-nums',
                    s.weight > 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300',
                  )}
                >
                  {s.weight > 0 ? '+' : ''}
                  {s.weight}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {recommendation && (
        <article
          className={cn(
            'rounded-2xl border p-5',
            tier === 'critical'
              ? 'border-rose-500/30 bg-rose-500/[0.04]'
              : 'border-amber-500/30 bg-amber-500/[0.04]',
          )}
          data-testid="health-recommendation"
        >
          <div
            className={cn(
              'font-mono text-[10px] uppercase tracking-[0.14em]',
              tier === 'critical'
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-amber-700 dark:text-amber-300',
            )}
          >
            ÖNERİ
          </div>
          <p className="mt-1 font-serif text-base font-medium">{recommendation}</p>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            Bu öneri tenant'ın son aktivitesi, abonelik durumu ve kullanım hacmine göre
            otomatik üretildi. Müşteri başarı ekibi takip eder.
          </p>
        </article>
      )}
    </section>
  )
}

export default TenantHealthPanel
