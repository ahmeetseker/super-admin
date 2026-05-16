// Wave F20.C — Churn risk list.
//
// Filters tenants down to {at-risk, critical} tiers (via getTenantHealth),
// sorts ascending by score (most critical first), and offers:
//   - "Tenant'a git" link → /tenants/:id (handled by F20.A scope, route lives
//     in F19 routing already).
//   - "İmpersonate" button → F11's `@/lib/impersonate` start API, which
//     hydrates ImpersonateBanner.
//
// Pure presentation — analytics work is delegated to
// `@/lib/super-admin-tenant-analytics`.

import { useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, UserCog } from '@landx/icons'
import type { Tenant } from '@landx/data'
import {
  getTenantHealth,
  tierBadgeClass,
  tierLabel,
  type TenantHealth,
} from '@/lib/super-admin-tenant-analytics'
import { start as startImpersonate } from '@/lib/impersonate'

interface ChurnRiskListProps {
  tenants: readonly Tenant[]
  /** Override clock for deterministic tests. */
  now?: number
  /** Override impersonate trigger (tests). */
  onImpersonate?: (tenant: Tenant) => void
}

interface RiskRow {
  tenant: Tenant
  health: TenantHealth
}

export function ChurnRiskList({ tenants, now, onImpersonate }: ChurnRiskListProps) {
  const rows = useMemo<RiskRow[]>(() => {
    const out: RiskRow[] = []
    for (const t of tenants) {
      const health = getTenantHealth(t, now)
      if (health.tier === 'at-risk' || health.tier === 'critical') {
        out.push({ tenant: t, health })
      }
    }
    return out.sort((a, b) => a.health.score - b.health.score)
  }, [tenants, now])

  const handleImpersonate = (tenant: Tenant) => {
    if (onImpersonate) {
      onImpersonate(tenant)
      return
    }
    startImpersonate({ id: tenant.id, name: tenant.name })
  }

  if (rows.length === 0) {
    return (
      <section
        data-testid="churn-risk-empty"
        aria-labelledby="churn-risk-heading"
        className="rounded-2xl border border-dashed border-border bg-card p-8 text-center"
      >
        <h3 id="churn-risk-heading" className="font-serif text-base tracking-tight">
          Churn risk listesi
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Şu anda risk altında veya kritik durumdaki tenant yok. Herkes sağlıklı.
        </p>
      </section>
    )
  }

  return (
    <section
      data-testid="churn-risk-list"
      aria-labelledby="churn-risk-heading"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <header className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h3
            id="churn-risk-heading"
            className="font-serif text-base tracking-tight"
          >
            Churn risk listesi
          </h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {rows.length} tenant · skor düşükten yükseğe
          </p>
        </div>
      </header>

      <ul className="flex flex-col gap-2" role="list">
        {rows.map(({ tenant, health }) => (
          <li
            key={tenant.id}
            data-testid={`churn-risk-row-${tenant.id}`}
            data-tier={health.tier}
            className="rounded-xl border border-border bg-background p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium tracking-tight">{tenant.name}</span>
                  <span
                    data-testid={`churn-risk-tier-${tenant.id}`}
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] ${tierBadgeClass(
                      health.tier,
                    )}`}
                  >
                    {tierLabel(health.tier)}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {tenant.plan} · skor {health.score}
                  </span>
                </div>
                {health.recommendation && (
                  <p
                    data-testid={`churn-risk-rec-${tenant.id}`}
                    className="mt-1.5 text-[12.5px] text-muted-foreground"
                  >
                    {health.recommendation}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  to={`/tenants/${tenant.id}`}
                  data-testid={`churn-risk-detail-${tenant.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[12px] font-medium text-foreground transition hover:bg-foreground/5"
                >
                  Tenant'a git
                  <ArrowUpRight className="h-3 w-3" aria-hidden />
                </Link>
                <button
                  type="button"
                  data-testid={`churn-risk-impersonate-${tenant.id}`}
                  onClick={() => handleImpersonate(tenant)}
                  className="inline-flex items-center gap-1 rounded-lg bg-foreground px-2.5 py-1 text-[12px] font-medium text-background transition hover:opacity-90"
                >
                  <UserCog className="h-3 w-3" aria-hidden />
                  İmpersonate
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ChurnRiskList
