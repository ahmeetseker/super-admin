/**
 * /orchestration — Wave F35 / Faz 2.
 *
 * Workflow Plan-Execute-Reflect viewer. Tab nav (Bekleyen onay / Çalışan /
 * Tamamlanan) — admin workflow listesi + agent workflow run timeline'ı.
 * Detail drawer'da step phase badge + completedAt + needsHumanApproval
 * için Onayla/Reddet butonları.
 */
import { useMemo, useState, useTransition } from 'react'
import { Check, X, Clock, PlayCircle, CheckCircle2, AlertTriangle, User, Cpu } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  useAdminWorkflows,
  useApproveWorkflowStep,
  useRejectWorkflowStep,
  useAgentWorkflowRuns,
  useApproveAgentWorkflowRun,
  type AdminWorkflow,
  type AdminWorkflowStep,
  type AdminWorkflowStepStatus,
  type AgentWorkflowRun,
  type AgentWorkflowRunStatus,
  type AgentWorkflowPhase,
} from '@landx/data'

type TabKey = 'pending' | 'running' | 'completed'

const TAB_LABEL: Record<TabKey, string> = {
  pending: 'Bekleyen onay',
  running: 'Çalışan',
  completed: 'Tamamlanan',
}

const STEP_TONE: Record<AdminWorkflowStepStatus, string> = {
  pending: 'bg-foreground/[0.06] text-foreground/70',
  running: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  done: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

const STEP_LABEL: Record<AdminWorkflowStepStatus, string> = {
  pending: 'Bekliyor',
  running: 'Çalışıyor',
  done: 'Bitti',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
}

const RUN_TONE: Record<AgentWorkflowRunStatus, string> = {
  pending: 'bg-foreground/[0.06] text-foreground/70',
  running: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  reflecting: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  failed: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

const RUN_LABEL: Record<AgentWorkflowRunStatus, string> = {
  pending: 'Bekliyor',
  running: 'Çalışıyor',
  reflecting: 'Yansıtılıyor',
  completed: 'Tamamlandı',
  failed: 'Başarısız',
}

const PHASE_TONE: Record<AgentWorkflowPhase, string> = {
  plan: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  execute: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  reflect: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

const PHASE_LABEL: Record<AgentWorkflowPhase, string> = {
  plan: 'Plan',
  execute: 'Execute',
  reflect: 'Reflect',
}

function formatRel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

function workflowPhase(w: AdminWorkflow): TabKey {
  if (w.steps.some((s) => s.status === 'pending' && s.needsApproval)) return 'pending'
  if (w.steps.some((s) => s.status === 'pending' || s.status === 'running')) return 'running'
  return 'completed'
}

function runPhase(r: AgentWorkflowRun): TabKey {
  if (r.needsHumanApproval) return 'pending'
  if (r.status === 'pending' || r.status === 'running' || r.status === 'reflecting')
    return 'running'
  return 'completed'
}

type DrawerSel =
  | { kind: 'admin'; id: string }
  | { kind: 'agent'; id: string }
  | null

const ADMIN_OPERATOR_ID = 'admin@landx.com'

export function Orchestration() {
  const [tab, setTab] = useState<TabKey>('pending')
  const [drawer, setDrawer] = useState<DrawerSel>(null)
  const [, startTransition] = useTransition()

  const { data: workflows = [] } = useAdminWorkflows()
  const { data: runs = [] } = useAgentWorkflowRuns()
  const approveStep = useApproveWorkflowStep()
  const rejectStep = useRejectWorkflowStep()
  const approveRun = useApproveAgentWorkflowRun()

  const filteredWorkflows = useMemo(
    () => workflows.filter((w) => workflowPhase(w) === tab),
    [workflows, tab],
  )
  const filteredRuns = useMemo(() => runs.filter((r) => runPhase(r) === tab), [runs, tab])

  const counts = useMemo(() => {
    const acc: Record<TabKey, number> = { pending: 0, running: 0, completed: 0 }
    for (const w of workflows) acc[workflowPhase(w)] += 1
    for (const r of runs) acc[runPhase(r)] += 1
    return acc
  }, [workflows, runs])

  const drawerData = useMemo(() => {
    if (!drawer) return null
    if (drawer.kind === 'admin') {
      const w = workflows.find((x) => x.id === drawer.id)
      return w ? ({ kind: 'admin', workflow: w } as const) : null
    }
    const r = runs.find((x) => x.id === drawer.id)
    return r ? ({ kind: 'agent', run: r } as const) : null
  }, [drawer, workflows, runs])

  function handleApproveAdminStep(workflowId: string, stepId: string) {
    startTransition(() => {
      approveStep.mutate({ workflowId, stepId, approver: ADMIN_OPERATOR_ID })
    })
  }
  function handleRejectAdminStep(workflowId: string, stepId: string) {
    startTransition(() => {
      rejectStep.mutate({ workflowId, stepId, approver: ADMIN_OPERATOR_ID })
    })
  }
  function handleApproveRun(runId: string, outcome: 'approve' | 'reject') {
    startTransition(() => {
      approveRun.mutate({ runId, approver: ADMIN_OPERATOR_ID, outcome })
    })
  }

  return (
    <PageShell
      eyebrow="MOD · A09 · WORKFLOWS"
      title={
        <>
          Plan · execute · <em className="font-serif italic font-light">reflect</em>
        </>
      }
      description={`${workflows.length} admin workflow + ${runs.length} agent run · human-in-the-loop onay akışı.`}
    >
      {/* Tab nav */}
      <div className="mb-5 inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1">
        {(['pending', 'running', 'completed'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition',
              tab === t
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'pending' && <AlertTriangle className="h-3 w-3" />}
            {t === 'running' && <PlayCircle className="h-3 w-3" />}
            {t === 'completed' && <CheckCircle2 className="h-3 w-3" />}
            {TAB_LABEL[t]}
            <span className="font-mono text-[10px] tabular-nums opacity-70">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Admin workflows */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <User className="h-3 w-3" /> Admin workflows ({filteredWorkflows.length})
          </h2>
          <ul className="space-y-2">
            {filteredWorkflows.map((w) => {
              const doneCount = w.steps.filter(
                (s) => s.status === 'done' || s.status === 'approved',
              ).length
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => setDrawer({ kind: 'admin', id: w.id })}
                    className="w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:bg-foreground/[0.02]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-serif text-base">{w.name}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {w.id} · {w.initiator}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                          {doneCount}/{w.steps.length} step
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      başladı: {formatRel(w.startedAt)}
                    </div>
                  </button>
                </li>
              )
            })}
            {filteredWorkflows.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Bu kategoride workflow yok.
              </li>
            )}
          </ul>
        </section>

        {/* Agent workflow runs */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <Cpu className="h-3 w-3" /> Agent runs ({filteredRuns.length})
          </h2>
          <ul className="space-y-2">
            {filteredRuns.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setDrawer({ kind: 'agent', id: r.id })}
                  className="w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:bg-foreground/[0.02]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-serif text-base">{r.workflowId}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {r.id} · {r.agentId}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                        RUN_TONE[r.status],
                      )}
                    >
                      {RUN_LABEL[r.status]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRel(r.createdAt)} · {r.steps.length} phase
                    {r.needsHumanApproval && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" /> onay bekliyor
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
            {filteredRuns.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Bu kategoride agent run yok.
              </li>
            )}
          </ul>
        </section>
      </div>

      {/* Detail drawer */}
      {drawerData && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-foreground/40"
          onClick={() => setDrawer(null)}
        >
          <aside
            className="h-full w-full max-w-md overflow-y-auto bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {drawerData.kind === 'admin' ? 'Admin workflow' : 'Agent run'}
                </div>
                <div className="mt-1 font-serif text-lg">
                  {drawerData.kind === 'admin'
                    ? drawerData.workflow.name
                    : drawerData.run.workflowId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawer(null)}
                aria-label="Kapat"
                className="rounded-lg border border-border bg-background p-1 text-muted-foreground transition hover:bg-foreground/[0.04]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>

            {drawerData.kind === 'admin' ? (
              <AdminWorkflowDrawer
                workflow={drawerData.workflow}
                onApproveStep={handleApproveAdminStep}
                onRejectStep={handleRejectAdminStep}
                actionPending={approveStep.isPending || rejectStep.isPending}
              />
            ) : (
              <AgentRunDrawer
                run={drawerData.run}
                onApprove={(outcome) => handleApproveRun(drawerData.run.id, outcome)}
                actionPending={approveRun.isPending}
              />
            )}
          </aside>
        </div>
      )}
    </PageShell>
  )
}

function AdminWorkflowDrawer({
  workflow,
  onApproveStep,
  onRejectStep,
  actionPending,
}: {
  workflow: AdminWorkflow
  onApproveStep: (workflowId: string, stepId: string) => void
  onRejectStep: (workflowId: string, stepId: string) => void
  actionPending: boolean
}) {
  return (
    <div className="space-y-4 px-5 py-4">
      <div className="rounded-xl border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground">
        <div>
          <strong className="text-foreground/80">ID:</strong> {workflow.id}
        </div>
        <div>
          <strong className="text-foreground/80">Initiator:</strong> {workflow.initiator}
        </div>
        <div>
          <strong className="text-foreground/80">Başlangıç:</strong>{' '}
          {new Date(workflow.startedAt).toLocaleString('tr-TR')}
        </div>
      </div>

      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Steps timeline
      </div>
      <ol className="space-y-2">
        {workflow.steps.map((s: AdminWorkflowStep, i) => (
          <li key={s.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">#{i + 1}</span>
                <div>
                  <div className="text-[13px] text-foreground/90">{s.name}</div>
                  {s.approver && (
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      onay: {s.approver}
                      {s.completedAt && ` · ${formatRel(s.completedAt)}`}
                    </div>
                  )}
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                  STEP_TONE[s.status],
                )}
              >
                {STEP_LABEL[s.status]}
              </span>
            </div>
            {s.status === 'pending' && s.needsApproval && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onApproveStep(workflow.id, s.id)}
                  disabled={actionPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" /> Onayla
                </button>
                <button
                  type="button"
                  onClick={() => onRejectStep(workflow.id, s.id)}
                  disabled={actionPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  <X className="h-3 w-3" /> Reddet
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function AgentRunDrawer({
  run,
  onApprove,
  actionPending,
}: {
  run: AgentWorkflowRun
  onApprove: (outcome: 'approve' | 'reject') => void
  actionPending: boolean
}) {
  return (
    <div className="space-y-4 px-5 py-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            RUN_TONE[run.status],
          )}
        >
          {RUN_LABEL[run.status]}
        </span>
        {run.needsHumanApproval && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" /> onay bekliyor
          </span>
        )}
      </div>
      <div className="rounded-xl border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground">
        <div>
          <strong className="text-foreground/80">Run ID:</strong> {run.id}
        </div>
        <div>
          <strong className="text-foreground/80">Workflow:</strong> {run.workflowId}
        </div>
        <div>
          <strong className="text-foreground/80">Agent:</strong> {run.agentId}
        </div>
        <div>
          <strong className="text-foreground/80">Başlangıç:</strong>{' '}
          {new Date(run.createdAt).toLocaleString('tr-TR')}
        </div>
      </div>

      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Plan · execute · reflect timeline
      </div>
      <ol className="space-y-2">
        {run.steps.map((step, i) => (
          <li key={i} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                  PHASE_TONE[step.phase],
                )}
              >
                {PHASE_LABEL[step.phase]}
              </span>
              <span
                className="font-mono text-[10px] text-muted-foreground"
                title={step.at}
              >
                {formatRel(step.at)}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/85">
              {step.output}
            </p>
          </li>
        ))}
      </ol>

      {run.needsHumanApproval && (
        <div className="flex gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => onApprove('approve')}
            disabled={actionPending}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Onayla
          </button>
          <button
            type="button"
            onClick={() => onApprove('reject')}
            disabled={actionPending}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Reddet
          </button>
        </div>
      )}
    </div>
  )
}
