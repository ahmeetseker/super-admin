// Wave F21.A — OperatorTable.
//
// Lists operators with search + role + status filters and per-row action menu
// (edit / suspend / reactivate / resend invite / delete). The super-admin
// app deliberately does not have a DataTable primitive yet; the page-level
// audit + tenants tables here are bespoke. This component follows the same
// shape (rounded-2xl border bg-card, font-mono uppercase column headers).
//
// The menu uses click-outside + Escape; same dropdown idiom as PluginCard.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  Mail,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserMinus,
} from '@landx/icons'
import { cn } from '@landx/ui'
import { ROLES } from '@landx/data'
import { RoleBadge } from './RoleBadge'
import type {
  Operator,
  OperatorRoleId,
  OperatorStatus,
} from '@/lib/operator-store'

const STATUS_TONE: Record<OperatorStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  invited: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  suspended: 'bg-stone-500/10 text-stone-700 dark:text-stone-300',
}

const STATUS_LABEL: Record<OperatorStatus, string> = {
  active: 'Aktif',
  invited: 'Davetli',
  suspended: 'Askıda',
}

const STATUS_OPTIONS: Array<{ value: OperatorStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'invited', label: 'Davetli' },
  { value: 'suspended', label: 'Askıda' },
]

function relativeTime(iso: string | undefined): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

interface Props {
  operators: Operator[]
  onEdit: (op: Operator) => void
  onSuspend: (op: Operator) => void
  onReactivate: (op: Operator) => void
  onResendInvite: (op: Operator) => void
  onDelete: (op: Operator) => void
}

export function OperatorTable({
  operators,
  onEdit,
  onSuspend,
  onReactivate,
  onResendInvite,
  onDelete,
}: Props) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<OperatorRoleId | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<OperatorStatus | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    return operators.filter((o) => {
      if (roleFilter !== 'all' && o.roleId !== roleFilter) return false
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (!q) return true
      const blob = `${o.email} ${o.name}`.toLocaleLowerCase('tr-TR')
      return blob.includes(q)
    })
  }, [operators, query, roleFilter, statusFilter])

  return (
    <section
      data-testid="operator-table-section"
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ad veya e-posta ara"
            aria-label="Operatörlerde ara"
            data-testid="operator-search"
            className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Rol
            </span>
            <select
              data-testid="operator-role-filter"
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as OperatorRoleId | 'all')
              }
              className="bg-transparent text-[13px] outline-none [&>option]:bg-background"
            >
              <option value="all">Tüm roller</option>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <div
            role="tablist"
            aria-label="Durum filtresi"
            className="inline-flex rounded-xl border border-border bg-background p-1"
          >
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={statusFilter === opt.value}
                onClick={() => setStatusFilter(opt.value)}
                data-testid={`operator-status-filter-${opt.value}`}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition',
                  statusFilter === opt.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-4 py-2.5">Ad</th>
              <th className="px-4 py-2.5">E-posta</th>
              <th className="px-4 py-2.5">Rol</th>
              <th className="px-4 py-2.5">Durum</th>
              <th className="px-4 py-2.5">Son giriş</th>
              <th className="px-4 py-2.5">2FA</th>
              <th className="w-10 px-3 py-2.5 text-right"></th>
            </tr>
          </thead>
          <tbody data-testid="operator-table-body">
            {filtered.map((op) => (
              <OperatorRow
                key={op.id}
                op={op}
                onEdit={onEdit}
                onSuspend={onSuspend}
                onReactivate={onReactivate}
                onResendInvite={onResendInvite}
                onDelete={onDelete}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                  data-testid="operator-empty"
                >
                  Bu filtreyle eşleşen operatör yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

interface RowProps {
  op: Operator
  onEdit: (op: Operator) => void
  onSuspend: (op: Operator) => void
  onReactivate: (op: Operator) => void
  onResendInvite: (op: Operator) => void
  onDelete: (op: Operator) => void
}

function OperatorRow({
  op,
  onEdit,
  onSuspend,
  onReactivate,
  onResendInvite,
  onDelete,
}: RowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <tr
      data-testid={`operator-row-${op.id}`}
      onClick={() => onEdit(op)}
      className="cursor-pointer border-b border-border/60 transition hover:bg-foreground/[0.02] last:border-0"
    >
      <td className="px-4 py-3 align-top text-[13px] font-medium">{op.name}</td>
      <td className="px-4 py-3 align-top">
        <div className="font-mono text-[11px] text-muted-foreground">
          {op.email}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <RoleBadge roleId={op.roleId} />
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
            STATUS_TONE[op.status],
          )}
        >
          {STATUS_LABEL[op.status]}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-[12.5px] text-muted-foreground">
        {relativeTime(op.lastLoginISO)}
      </td>
      <td className="px-4 py-3 align-top">
        {op.twofaEnrolled ? (
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Açık
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[12px] text-rose-700 dark:text-rose-300">
            <ShieldOff className="h-3.5 w-3.5" />
            Kapalı
          </span>
        )}
      </td>
      <td className="px-3 py-3 align-top text-right">
        <div ref={menuRef} className="relative inline-block">
          <button
            type="button"
            aria-label={`${op.name} aksiyonları`}
            data-testid={`operator-actions-${op.id}`}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-7 z-30 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
            >
              <MenuItem
                onClick={() => {
                  setMenuOpen(false)
                  onEdit(op)
                }}
                icon={Pencil}
                label="Düzenle"
                testId={`operator-action-edit-${op.id}`}
              />
              {op.status === 'invited' && (
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false)
                    onResendInvite(op)
                  }}
                  icon={Mail}
                  label="Davet'i yeniden gönder"
                  testId={`operator-action-resend-${op.id}`}
                />
              )}
              {op.status === 'suspended' ? (
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false)
                    onReactivate(op)
                  }}
                  icon={CheckCircle2}
                  label="Aktifleştir"
                  testId={`operator-action-reactivate-${op.id}`}
                />
              ) : (
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false)
                    onSuspend(op)
                  }}
                  icon={UserMinus}
                  label="Askıya al"
                  testId={`operator-action-suspend-${op.id}`}
                />
              )}
              <MenuItem
                onClick={() => {
                  setMenuOpen(false)
                  onDelete(op)
                }}
                icon={Trash2}
                label="Sil"
                tone="danger"
                testId={`operator-action-delete-${op.id}`}
              />
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

interface MenuItemProps {
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  tone?: 'default' | 'danger'
  testId?: string
}

function MenuItem({ onClick, icon: Icon, label, tone = 'default', testId }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px]',
        tone === 'danger'
          ? 'text-rose-600 hover:bg-rose-500/5 dark:text-rose-300'
          : 'hover:bg-foreground/5',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

export default OperatorTable
