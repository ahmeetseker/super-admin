// Wave F26.A — /feature-flags dashboard.
// KPI strip + searchable table + create modal. Backed by @/lib/feature-flags
// localStorage store (seeded in F26.0). All mutations route through the
// store so refresh() simply re-reads to keep the view in sync.

import { useCallback, useMemo, useState } from 'react'
import { Plus } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { getFeatureFlags, type FeatureFlag } from '@/lib/feature-flags'
import { FeatureFlagsTable } from '@/components/feature-flags/FeatureFlagsTable'
import { CreateFlagModal } from '@/components/feature-flags/CreateFlagModal'

function computeStats(flags: FeatureFlag[]) {
  const total = flags.length
  const enabled = flags.filter((f) => f.enabled).length
  const fullRollout = flags.filter((f) => f.enabled && f.rolloutPct >= 100).length
  const tagCounts = new Map<string, number>()
  flags.forEach((f) => {
    f.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1))
  })
  const topTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  return { total, enabled, fullRollout, topTag }
}

export function FeatureFlagsRoute() {
  const [flags, setFlags] = useState<FeatureFlag[]>(() => getFeatureFlags())
  const [createOpen, setCreateOpen] = useState(false)

  const refresh = useCallback(() => {
    setFlags(getFeatureFlags())
  }, [])

  const stats = useMemo(() => computeStats(flags), [flags])

  return (
    <PageShell
      eyebrow="OPS · FEATURE FLAGS"
      title={
        <>
          Feature <em className="font-serif italic font-light text-muted-foreground">flag</em>
        </>
      }
      description={`${stats.total} flag · ${stats.enabled} açık · ${stats.fullRollout} tam rollout`}
      actions={
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          data-testid="create-flag-cta"
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Yeni feature flag
        </button>
      }
    >
      <section
        className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
        data-testid="feature-flags-kpi"
      >
        <Stat
          label="Toplam flag"
          value={String(stats.total)}
          hint={`${stats.total - stats.enabled} kapalı`}
        />
        <Stat
          label="Açık"
          value={String(stats.enabled)}
          hint={`${stats.total - stats.enabled} kapalı`}
          tone={stats.enabled > 0 ? 'pos' : undefined}
        />
        <Stat
          label="Tam rollout"
          value={String(stats.fullRollout)}
          hint={stats.fullRollout > 0 ? '%100 dağıtım' : 'henüz yok'}
        />
        <Stat
          label="Öne çıkan etiket"
          value={stats.topTag ? stats.topTag[0] : '—'}
          hint={stats.topTag ? `${stats.topTag[1]} flag` : 'etiket yok'}
        />
      </section>

      <FeatureFlagsTable flags={flags} onChange={refresh} />

      <CreateFlagModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refresh}
      />
    </PageShell>
  )
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone?: 'pos' | 'warn'
}) {
  return (
    <article
      className={cn(
        'rounded-2xl border bg-card p-4',
        tone === 'warn'
          ? 'border-rose-500/30 bg-rose-500/[0.04]'
          : tone === 'pos'
            ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
            : 'border-border',
      )}
      data-testid={`feature-flags-stat-${label}`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 font-serif text-2xl font-light tabular-nums',
          tone === 'warn'
            ? 'text-rose-700 dark:text-rose-300'
            : tone === 'pos'
              ? 'text-emerald-700 dark:text-emerald-300'
              : '',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}

export default FeatureFlagsRoute
