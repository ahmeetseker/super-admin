// Wave F21.A — /operators dashboard.
//
// Layout: PageShell with "Operatör davet et" CTA → 4-up 2FA coverage stat row
// → OperatorTable (filterable, with per-row action menu) → self-audit panel
// scoped to the first super-admin operator (mock current user; real auth
// landing comes with the LandX backend wave).
//
// Modal mount is lazy via local state — the form bundle only loads when the
// admin actually invites or edits someone (race-disciplined: root.tsx + main
// stayed untouched per F21.0).

import { useCallback, useMemo, useState } from 'react'
import { Plus } from '@landx/icons'
import { PageShell } from '@landx/ui'
import {
  deleteOperator,
  get2faCoverage,
  getOperators,
  reactivateOperator,
  resendInvite,
  suspendOperator,
  type Operator,
} from '@/lib/operator-store'
import { OperatorTable } from '@/components/operators/OperatorTable'
import { OperatorFormModal } from '@/components/operators/OperatorFormModal'
import { OperatorSelfAuditPanel } from '@/components/operators/OperatorSelfAuditPanel'

function pickCurrentUser(ops: Operator[]): Operator | null {
  // Mock identity until the LandX backend supplies the real session — pick
  // the first super-admin operator (matches the F11 ROLES seed where
  // ahmet@turksab.com is the canonical "platform owner").
  return ops.find((o) => o.roleId === 'super-admin') ?? ops[0] ?? null
}

export function Operators() {
  const [operators, setOperators] = useState<Operator[]>(() => getOperators())
  const [modalOpen, setModalOpen] = useState(false)
  // null inside modalOpen → create mode; Operator → edit mode.
  const [editTarget, setEditTarget] = useState<Operator | null>(null)

  const refresh = useCallback(() => {
    setOperators(getOperators())
  }, [])

  const currentUser = useMemo(() => pickCurrentUser(operators), [operators])

  const coverage = useMemo(() => get2faCoverage(), [operators])
  const counts = useMemo(() => {
    let active = 0
    let invited = 0
    let suspended = 0
    for (const o of operators) {
      if (o.status === 'active') active++
      else if (o.status === 'invited') invited++
      else if (o.status === 'suspended') suspended++
    }
    return { active, invited, suspended, total: operators.length }
  }, [operators])

  const handleCreate = () => {
    setEditTarget(null)
    setModalOpen(true)
  }

  const handleEdit = (op: Operator) => {
    setEditTarget(op)
    setModalOpen(true)
  }

  const handleSuspend = (op: Operator) => {
    suspendOperator(op.id)
    refresh()
  }

  const handleReactivate = (op: Operator) => {
    reactivateOperator(op.id)
    refresh()
  }

  const handleResend = (op: Operator) => {
    resendInvite(op.id)
    refresh()
  }

  const handleDelete = (op: Operator) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        `${op.name} (${op.email}) operatörünü silmek istediğinden emin misin?`,
      )
      if (!ok) return
    }
    deleteOperator(op.id)
    refresh()
  }

  return (
    <PageShell
      eyebrow="OPS · OPERATÖR"
      title={
        <>
          Operatör{' '}
          <em className="font-serif italic font-light text-muted-foreground">
            yönetimi
          </em>
        </>
      }
      description={`${counts.total} operatör · ${counts.active} aktif · ${counts.invited} davetli · ${counts.suspended} askıda · ${coverage.rate}% 2FA.`}
      actions={
        <button
          type="button"
          onClick={handleCreate}
          data-testid="operator-invite-cta"
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Operatör davet et
        </button>
      }
    >
      <section
        className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
        data-testid="operator-coverage-row"
      >
        <Stat
          label="Toplam operatör"
          value={String(counts.total)}
          hint={`${counts.active} aktif`}
        />
        <Stat
          label="2FA açık"
          value={String(coverage.enrolled)}
          hint={`${coverage.missing} eksik`}
        />
        <Stat
          label="2FA kapsamı"
          value={`${coverage.rate}%`}
          hint={coverage.rate >= 90 ? 'iyi' : 'hedef ≥ 90%'}
        />
        <Stat
          label="Davet / Askı"
          value={`${counts.invited} / ${counts.suspended}`}
          hint="davetli · askıda"
        />
      </section>

      <div className="mb-6">
        <OperatorTable
          operators={operators}
          onEdit={handleEdit}
          onSuspend={handleSuspend}
          onReactivate={handleReactivate}
          onResendInvite={handleResend}
          onDelete={handleDelete}
        />
      </div>

      <OperatorSelfAuditPanel
        currentUserEmail={currentUser?.email ?? null}
        currentUserLabel={currentUser?.name}
      />

      {modalOpen && (
        <OperatorFormModal
          open={modalOpen}
          initial={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            refresh()
          }}
        />
      )}
    </PageShell>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}

export default Operators
