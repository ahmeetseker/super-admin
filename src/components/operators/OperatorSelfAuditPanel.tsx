// Wave F21.A — OperatorSelfAuditPanel.
//
// Each super-admin should see their own AUDIT_LOG slice without leaving the
// /operators page (compliance ask: "I want to know what I did last week
// before the auditor asks me"). We filter AUDIT_LOG by `actor === currentUser`
// and show the last N entries — outcome-tone matches the /audit table so the
// visual language is consistent.

import { useMemo } from 'react'
import { CheckCircle2, History, XCircle } from '@landx/icons'
import { cn } from '@landx/ui'
import { AUDIT_LOG, type AuditEntry } from '@landx/data'

const OUTCOME_TONE: Record<AuditEntry['outcome'], string> = {
  success: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10',
  failure: 'text-rose-700 dark:text-rose-300 bg-rose-500/10',
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

function absoluteTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

interface Props {
  /** Email of the currently signed-in operator. AUDIT_LOG.actor is matched
   *  case-insensitively against this value. */
  currentUserEmail: string | null
  /** Display name shown in the panel header — falls back to email. */
  currentUserLabel?: string
  /** Max entries to show (default 20). */
  limit?: number
}

export function OperatorSelfAuditPanel({
  currentUserEmail,
  currentUserLabel,
  limit = 20,
}: Props) {
  const entries = useMemo(() => {
    if (!currentUserEmail) return []
    const needle = currentUserEmail.toLowerCase()
    return AUDIT_LOG
      .filter((e) => e.actor.toLowerCase() === needle)
      .slice()
      .sort((a, b) => b.atISO.localeCompare(a.atISO))
      .slice(0, limit)
  }, [currentUserEmail, limit])

  return (
    <section
      data-testid="operator-self-audit-panel"
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="flex flex-col gap-1 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Kendi audit'in
          </div>
          <h3 className="mt-0.5 font-serif text-base font-medium">
            {currentUserLabel ?? currentUserEmail ?? 'Operatör'} aktivitesi
          </h3>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Son {Math.min(entries.length, limit)} kayıt
        </div>
      </header>

      {entries.length === 0 ? (
        <div
          data-testid="operator-self-audit-empty"
          className="px-4 py-10 text-center text-sm text-muted-foreground"
        >
          {currentUserEmail
            ? 'Bu operatöre ait audit kaydı yok.'
            : 'Aktif operatör bulunamadı.'}
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {entries.map((e) => (
            <li
              key={e.id}
              data-testid={`self-audit-entry-${e.id}`}
              className="flex items-start gap-3 px-4 py-3"
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 flex-none items-center justify-center rounded-full',
                  OUTCOME_TONE[e.outcome],
                )}
              >
                {e.outcome === 'success' ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[11px] text-foreground/80">
                    {e.action}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {e.resourceType}/{e.resourceId}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {e.id} · {e.ip}
                </div>
              </div>
              <div
                className="text-right text-[11.5px] text-muted-foreground"
                title={absoluteTime(e.atISO)}
              >
                {relativeTime(e.atISO)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default OperatorSelfAuditPanel
