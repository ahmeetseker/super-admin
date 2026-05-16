// Wave F26.C — A/B experiments dashboard.
//
// Composition:
//   - 4-up KPI strip (Toplam / Aktif / Tamamlanmış / Draft)
//   - ExperimentTable with status filter + row-click selection
//   - Detail panel (DistributionChart + read-only VariantEditor) for the
//     currently-selected experiment
//   - CreateExperimentModal launched from the eyebrow "Yeni deney" CTA
//
// State sourced from `@/lib/ab-experiments` (F26.0). The store is
// localStorage-backed so reloads keep both seed + user-created experiments.

import { useMemo, useState } from 'react'
import { PageShell } from '@landx/ui'
import {
  deleteExperiment,
  getExperiments,
  updateExperiment,
  type Experiment,
  type ExperimentStatus,
} from '@/lib/ab-experiments'
import {
  ExperimentTable,
  statusBadgeClass,
  statusLabel,
  type StatusFilter,
} from '@/components/experiments/ExperimentTable'
import { DistributionChart } from '@/components/experiments/DistributionChart'
import { VariantEditor } from '@/components/experiments/VariantEditor'
import { CreateExperimentModal } from '@/components/experiments/CreateExperimentModal'

function summarize(experiments: readonly Experiment[]) {
  const total = experiments.length
  let running = 0
  let draft = 0
  let completed = 0
  for (const exp of experiments) {
    if (exp.status === 'running') running += 1
    else if (exp.status === 'draft') draft += 1
    else if (exp.status === 'completed') completed += 1
  }
  return { total, running, draft, completed }
}

interface KpiTileProps {
  label: string
  value: number
  testid: string
  tone?: 'default' | 'emerald' | 'sky' | 'amber'
}

function KpiTile({ label, value, testid, tone = 'default' }: KpiTileProps) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'sky'
        ? 'text-sky-700 dark:text-sky-300'
        : tone === 'amber'
          ? 'text-amber-700 dark:text-amber-300'
          : 'text-foreground'
  return (
    <div
      data-testid={testid}
      className="rounded-2xl border border-border bg-card px-4 py-3"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className={'mt-1 font-serif text-2xl font-light tabular-nums ' + toneClass}>
        {value}
      </div>
    </div>
  )
}

export function ExperimentsRoute() {
  // Bump key to force re-read of localStorage-backed store after mutations.
  const [version, setVersion] = useState(0)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const experiments = useMemo(() => getExperiments(), [version])
  const kpis = useMemo(() => summarize(experiments), [experiments])
  const selected = useMemo(
    () => experiments.find((e) => e.id === selectedId) ?? null,
    [experiments, selectedId],
  )

  const refresh = () => setVersion((v) => v + 1)

  const handleStatusChange = (next: ExperimentStatus) => {
    if (!selected) return
    updateExperiment(selected.id, { status: next })
    refresh()
  }

  const handleDelete = () => {
    if (!selected) return
    deleteExperiment(selected.id)
    setSelectedId(null)
    refresh()
  }

  return (
    <PageShell
      eyebrow="OPS · A/B"
      title={
        <>
          A/B <em className="font-serif italic font-light text-muted-foreground">deneyleri</em>
        </>
      }
      description="Varyant tanımları, ağırlık dağılımı ve exposure / conversion görselleştirmesi. Seed + localStorage."
      actions={
        <button
          type="button"
          data-testid="experiments-create-button"
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-foreground px-3 py-1.5 text-sm font-medium text-background transition hover:opacity-90"
        >
          + Yeni deney
        </button>
      }
    >
      <div data-testid="experiments-dashboard" className="flex flex-col gap-4">
        <div
          data-testid="experiments-kpis"
          className="grid grid-cols-2 gap-3 md:grid-cols-4"
        >
          <KpiTile label="Toplam" value={kpis.total} testid="experiments-kpi-total" />
          <KpiTile
            label="Aktif"
            value={kpis.running}
            testid="experiments-kpi-running"
            tone="emerald"
          />
          <KpiTile
            label="Tamamlanmış"
            value={kpis.completed}
            testid="experiments-kpi-completed"
            tone="sky"
          />
          <KpiTile
            label="Taslak"
            value={kpis.draft}
            testid="experiments-kpi-draft"
            tone="amber"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <ExperimentTable
            experiments={experiments}
            filter={filter}
            onFilterChange={setFilter}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {selected ? (
            <aside
              data-testid="experiment-detail"
              aria-labelledby="experiment-detail-heading"
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <header className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3
                    id="experiment-detail-heading"
                    className="truncate font-serif text-base tracking-tight"
                  >
                    {selected.name}
                  </h3>
                  <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {selected.key} · {selected.variants.length} varyant
                  </p>
                </div>
                <span
                  className={
                    'shrink-0 rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] ' +
                    statusBadgeClass(selected.status)
                  }
                >
                  {statusLabel(selected.status)}
                </span>
              </header>

              {selected.description && (
                <p className="text-[12.5px] text-muted-foreground">{selected.description}</p>
              )}

              <DistributionChart variants={selected.variants} />

              <VariantEditor
                variants={selected.variants.map((v) => ({
                  key: v.key,
                  name: v.name,
                  weight: v.weight,
                }))}
                onChange={() => {
                  /* detail panel is read-only; edits go through the modal */
                }}
                readOnly
              />

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Durum
                  <select
                    data-testid="experiment-status-select"
                    value={selected.status}
                    onChange={(e) => handleStatusChange(e.target.value as ExperimentStatus)}
                    className="rounded-lg border border-border bg-card px-2 py-1 font-sans text-sm normal-case tracking-normal"
                  >
                    <option value="draft">Taslak</option>
                    <option value="running">Aktif</option>
                    <option value="paused">Duraklatıldı</option>
                    <option value="completed">Tamamlandı</option>
                  </select>
                </label>
                <button
                  type="button"
                  data-testid="experiment-delete"
                  onClick={handleDelete}
                  className="ml-auto rounded-lg border border-rose-500/30 px-2.5 py-1 text-[12px] font-medium text-rose-700 transition hover:bg-rose-500/[0.06] dark:text-rose-300"
                >
                  Sil
                </button>
              </div>
            </aside>
          ) : (
            <aside
              data-testid="experiment-detail-empty"
              className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground"
            >
              Bir deney seç, varyant dağılımını ve ağırlıkları burada gör.
            </aside>
          )}
        </div>
      </div>

      <CreateExperimentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(exp) => {
          setSelectedId(exp.id)
          setModalOpen(false)
          refresh()
        }}
      />
    </PageShell>
  )
}

export default ExperimentsRoute
