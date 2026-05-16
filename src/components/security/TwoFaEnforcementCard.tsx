// Wave F21.B — 2FA enforcement coverage kartı.
// get2faCoverage (F21.0 operator-store) ile enrolled/missing/rate stats
// gösterir. "Eksik kullanıcılar" listesi = getOperators().filter(!twofaEnrolled).

import { useMemo } from 'react'
import { Mail, ShieldAlert, ShieldCheck } from '@landx/icons'
import {
  get2faCoverage,
  getOperators,
  getRoleLabel,
  type Operator,
} from '@/lib/operator-store'

function relativeTime(iso?: string): string {
  if (!iso) return 'hiç giriş yok'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

export interface TwoFaEnforcementCardProps {
  /**
   * Force a re-derive (consumers can bump a version key when policy or
   * operators change). Defaults to 0 — pure read on mount.
   */
  refreshKey?: number
}

export function TwoFaEnforcementCard({
  refreshKey = 0,
}: TwoFaEnforcementCardProps = {}) {
  const coverage = useMemo(
    () => get2faCoverage(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey],
  )
  const missing = useMemo<Operator[]>(
    () => getOperators().filter((o) => !o.twofaEnrolled),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey],
  )
  const total = coverage.enrolled + coverage.missing
  const tone =
    coverage.rate >= 90
      ? 'text-emerald-700 dark:text-emerald-300'
      : coverage.rate >= 60
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-rose-700 dark:text-rose-300'

  return (
    <section
      data-testid="twofa-enforcement-card"
      className="rounded-2xl border border-border bg-card"
    >
      <header className="border-b border-border/60 px-5 py-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          2FA · COVERAGE
        </div>
        <h3 className="mt-1 font-serif text-lg font-light tracking-tight">
          Operatör <em className="font-serif italic font-light">kapsama</em>
        </h3>
      </header>

      <div className="grid grid-cols-3 gap-3 p-5">
        <Stat
          label="Enrolled"
          value={String(coverage.enrolled)}
          hint={`/ ${total} operatör`}
          icon={
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
          }
          testid="twofa-stat-enrolled"
        />
        <Stat
          label="Eksik"
          value={String(coverage.missing)}
          hint="2FA yok"
          icon={
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-300" />
          }
          testid="twofa-stat-missing"
        />
        <Stat
          label="Rate"
          value={`${coverage.rate}%`}
          hint="enroll oranı"
          tone={tone}
          testid="twofa-stat-rate"
        />
      </div>

      <div className="px-5 pb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            EKSİK OPERATÖRLER
          </div>
          <div className="text-[11px] text-muted-foreground">
            {missing.length} kişi
          </div>
        </div>

        {missing.length === 0 ? (
          <div
            data-testid="twofa-missing-empty"
            className="rounded-xl border border-border/60 bg-background px-4 py-6 text-center text-[12.5px] text-muted-foreground"
          >
            Tüm operatörler 2FA enroll'lu.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border/60">
            {missing.map((op, i) => (
              <li
                key={op.id}
                data-testid="twofa-missing-row"
                data-operator-id={op.id}
                className={
                  'flex items-center justify-between gap-3 px-4 py-2.5 ' +
                  (i < missing.length - 1 ? 'border-b border-border/60' : '')
                }
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Mail className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-medium">
                      {op.email}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {getRoleLabel(op.roleId)} · son giriş{' '}
                      {relativeTime(op.lastLoginISO)}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-rose-700 dark:text-rose-300">
                  <ShieldAlert className="h-3 w-3" /> 2FA yok
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

interface StatProps {
  label: string
  value: string
  hint: string
  icon?: React.ReactNode
  tone?: string
  testid?: string
}

function Stat({ label, value, hint, icon, tone, testid }: StatProps) {
  return (
    <article
      data-testid={testid}
      className="rounded-xl border border-border/60 bg-background p-3"
    >
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={
          'mt-1 font-serif text-2xl font-light tabular-nums ' + (tone ?? '')
        }
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
    </article>
  )
}

export default TwoFaEnforcementCard
