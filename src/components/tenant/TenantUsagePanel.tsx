// Wave F20.A — TenantUsagePanel
//
// "Kullanım" tab on /tenants/:id. Three progress bars (ilan / kullanıcı /
// storage) with plan-tier ceilings, plus last-activity + a CSV-export shortcut
// (re-uses the F13.B UsageReportButton helper).
//
// All data is derived from the F20.0 analytics lib + tenant seed. No async,
// no localStorage — the panel is fully deterministic.

import { useMemo } from 'react'
import type { Tenant } from '@landx/data'
import { cn, timeAgo } from '@landx/ui'
import { getResourceUsage } from '@/lib/super-admin-tenant-analytics'
import { UsageReportButton } from '@/components/tenant/UsageReportButton'

export interface TenantUsagePanelProps {
  tenant: Tenant
}

interface PlanCeilings {
  listings: number
  users: number
  storageMb: number
}

// Plan-tier caps mirror the F11.x plan-comparison table. Free is a trial-like
// tier (5 ilan / 2 kullanıcı / 100 MB); Pro lands in the middle; Enterprise
// gets the "büyük şirket" headroom. These are read-only display ceilings —
// gerçek quota enforcement backend tarafında olacak.
const PLAN_CEILINGS: Record<Tenant['plan'], PlanCeilings> = {
  Free: { listings: 5, users: 2, storageMb: 100 },
  Pro: { listings: 50, users: 10, storageMb: 5_000 },
  Enterprise: { listings: 500, users: 50, storageMb: 50_000 },
}

function pct(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, Math.round((value / max) * 1000) / 10)
}

function toneFor(percent: number): { bar: string; label: string } {
  if (percent >= 90) return { bar: 'bg-rose-500', label: 'text-rose-700 dark:text-rose-300' }
  if (percent >= 70) return { bar: 'bg-amber-500', label: 'text-amber-700 dark:text-amber-300' }
  return { bar: 'bg-emerald-500', label: 'text-emerald-700 dark:text-emerald-300' }
}

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} GB`
  return `${mb.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} MB`
}

export function TenantUsagePanel({ tenant }: TenantUsagePanelProps) {
  const ceilings = PLAN_CEILINGS[tenant.plan]
  const usage = useMemo(() => getResourceUsage(tenant), [tenant])

  const rows = [
    {
      key: 'listings',
      label: 'İlan',
      hint: `${tenant.plan} plan üst sınır`,
      value: tenant.listingCount,
      max: ceilings.listings,
      display: `${tenant.listingCount.toLocaleString('tr-TR')} / ${ceilings.listings.toLocaleString('tr-TR')}`,
      testId: 'usage-bar-listings',
    },
    {
      key: 'users',
      label: 'Kullanıcı',
      hint: `${tenant.plan} plan koltuk sayısı`,
      value: tenant.userCount,
      max: ceilings.users,
      display: `${tenant.userCount.toLocaleString('tr-TR')} / ${ceilings.users.toLocaleString('tr-TR')}`,
      testId: 'usage-bar-users',
    },
    {
      key: 'storage',
      label: 'Depolama',
      hint: `medya + döküman, ${tenant.plan} plan kotası`,
      value: usage.storageMb,
      max: ceilings.storageMb,
      display: `${formatMb(usage.storageMb)} / ${formatMb(ceilings.storageMb)}`,
      testId: 'usage-bar-storage',
    },
  ]

  return (
    <section data-testid="tenant-usage-panel" className="space-y-6">
      <article className="rounded-2xl border border-border bg-card p-5">
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              KULLANIM KOTALARI
            </div>
            <h3 className="font-serif text-lg font-medium">{tenant.plan} plan tüketimi</h3>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            son aktivite {timeAgo(tenant.lastActiveISO)}
          </span>
        </header>

        <ul className="space-y-4">
          {rows.map((row) => {
            const percent = pct(row.value, row.max)
            const tone = toneFor(percent)
            return (
              <li key={row.key} data-testid={row.testId}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium">{row.label}</span>
                  <span
                    className={cn(
                      'font-mono text-[11px] tabular-nums',
                      percent >= 70 ? tone.label : 'text-muted-foreground',
                    )}
                  >
                    {row.display}
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.label}: %${percent}`}
                >
                  <div
                    className={cn('h-full rounded-full transition-all', tone.bar)}
                    style={{ width: `${percent}%` }}
                    data-testid={`${row.testId}-fill`}
                    data-tone={percent >= 90 ? 'critical' : percent >= 70 ? 'warning' : 'ok'}
                  />
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>{row.hint}</span>
                  <span className="tabular-nums">%{percent.toLocaleString('tr-TR')}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </article>

      <article className="rounded-2xl border border-border bg-card p-5">
        <header className="mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            API + STORAGE PROJEKSİYONU
          </div>
          <h3 className="font-serif text-base font-medium">30-gün proxy</h3>
        </header>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
          <Metric label="DB satır" value={usage.dbRows.toLocaleString('tr-TR')} />
          <Metric label="Storage" value={formatMb(usage.storageMb)} />
          <Metric label="İstek / gün" value={usage.reqsPerDay.toLocaleString('tr-TR')} />
          <Metric label="API çağrı / ay" value={usage.apiCallsThisMonth.toLocaleString('tr-TR')} />
        </dl>
        <div className="mt-4">
          <UsageReportButton tenantId={tenant.id} tenantName={tenant.name} />
        </div>
      </article>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-serif text-lg font-light tabular-nums">{value}</dd>
    </div>
  )
}

export default TenantUsagePanel
