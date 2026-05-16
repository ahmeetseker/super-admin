// Wave F20.C — /cohorts dashboard.
//
// Three sections, all built on the F20.0 tenant-analytics lib:
//   1. RetentionSummary — KpiCard strip with 30/60/90d retention + risk count
//   2. CohortMatrix     — signup month × retention window heatmap
//   3. ChurnRiskList    — at-risk + critical tenants with detail + impersonate
//
// Read-only: no mutations, no localStorage. When real billing/retention data
// lands, swap the analytics lib internals — this page stays unchanged.

import { useMemo } from 'react'
import { PageShell } from '@landx/ui'
import { useTenants } from '@landx/data'
import { getCohortMatrix } from '@/lib/super-admin-tenant-analytics'
import { CohortMatrix } from '@/components/cohorts/CohortMatrix'
import { ChurnRiskList } from '@/components/cohorts/ChurnRiskList'
import { RetentionSummary } from '@/components/cohorts/RetentionSummary'

export function Cohorts() {
  const { data: tenants = [], isPending } = useTenants({})
  const cohortRows = useMemo(() => getCohortMatrix(), [])

  return (
    <PageShell
      eyebrow="OPS · COHORT"
      title={
        <>
          Cohort <em className="font-serif italic font-light text-muted-foreground">analizi</em>
        </>
      }
      description="Signup ay × retention matrisi ve churn risk listesi."
    >
      <div data-testid="cohorts-dashboard" className="flex flex-col gap-6">
        <RetentionSummary rows={cohortRows} tenants={tenants} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <CohortMatrix rows={cohortRows} />
          {isPending ? (
            <div
              data-testid="cohorts-loading"
              className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground"
            >
              Tenant verisi yükleniyor.
            </div>
          ) : (
            <ChurnRiskList tenants={tenants} />
          )}
        </div>
      </div>
    </PageShell>
  )
}

export default Cohorts
