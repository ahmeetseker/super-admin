// Wave F21.A — RoleBadge.
// Token-aligned pill renderer for the five super-admin roles. Tints follow
// the F21 spec (rose / sky / emerald / amber / stone) and use the shared
// `*-500/10` + `text-*-700 dark:text-*-300` palette pattern that the rest of
// the super-admin surface uses for status chips.

import { cn } from '@landx/ui'
import { getRoleLabel, type OperatorRoleId } from '@/lib/operator-store'

const ROLE_TONE: Record<OperatorRoleId, string> = {
  'super-admin': 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  support: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  'billing-ops': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  compliance: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'readonly-auditor': 'bg-stone-500/10 text-stone-700 dark:text-stone-300',
}

interface Props {
  roleId: OperatorRoleId
  className?: string
}

export function RoleBadge({ roleId, className }: Props) {
  const tone = ROLE_TONE[roleId] ?? 'bg-foreground/[0.06] text-foreground/80'
  return (
    <span
      data-testid={`role-badge-${roleId}`}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]',
        tone,
        className,
      )}
    >
      {getRoleLabel(roleId)}
    </span>
  )
}

// Exported for unit-test parity with the spec tint table.
export const ROLE_BADGE_TONE = ROLE_TONE
