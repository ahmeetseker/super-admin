// Wave F20.B — LTV per plan grid.
//
// One card per plan; ordered by descending LTV. Each card shows:
//   - plan name + tenant count
//   - mean MRR (per tenant)
//   - LTV       (mean MRR / churn rate, computed in F20.0)
//
// Pure presentational — input is `LtvByPlan[]` from
// `super-admin-tenant-analytics.getLtvPerPlan()`.

import { formatTLCompact } from '@landx/ui'
import type { LtvByPlan } from '@/lib/super-admin-tenant-analytics'

export interface LtvByPlanCardProps {
  rows: readonly LtvByPlan[]
}

export function LtvByPlanCard({ rows }: LtvByPlanCardProps) {
  return (
    <section
      data-testid="revenue-ltv-grid"
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Plan başına
          </div>
          <div className="font-serif text-base">LTV dökümü</div>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {rows.length} plan
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          className="px-4 py-10 text-center text-[12px] text-muted-foreground"
          data-testid="revenue-ltv-empty"
        >
          Plan verisi yok.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => (
            <article
              key={row.plan}
              data-testid={`revenue-ltv-${row.plan.toLowerCase()}`}
              className="flex flex-col gap-3 bg-card p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-serif text-lg">{row.plan}</span>
                <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground">
                  {row.count} tenant
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Ort. MRR
                  </dt>
                  <dd className="mt-0.5 font-serif text-[15px] tabular-nums">
                    {formatTLCompact(row.meanMrr)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    LTV
                  </dt>
                  <dd
                    className="mt-0.5 font-serif text-[15px] tabular-nums text-foreground"
                    data-testid={`revenue-ltv-value-${row.plan.toLowerCase()}`}
                  >
                    {formatTLCompact(row.ltv)}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default LtvByPlanCard
