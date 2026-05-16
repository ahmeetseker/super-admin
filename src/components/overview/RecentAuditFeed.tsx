// RecentAuditFeed — last 8 audit events as a compact feed on the
// super-admin overview dashboard. Wave F3 / Agent-F3D.
//
// Click row → /audit?id={entryId} (the audit route handles the drawer
// open if it sees an `id` query param). Token-only outcome chips.

import { useNavigate } from 'react-router'
import { CheckCircle2, Cpu, User, XCircle } from '@landx/icons'
import { cn } from '@landx/ui'
import type { AuditEntry } from '@landx/data'

interface RecentAuditFeedProps {
  entries: readonly AuditEntry[]
  loading?: boolean
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

function absoluteTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function RecentAuditFeed({ entries, loading }: RecentAuditFeedProps) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Olay akışı
          </div>
          <div className="font-serif text-base">Son denetim olayları</div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/audit')}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground"
        >
          Tümü →
        </button>
      </div>
      <ul data-testid="recent-audit-list" className="divide-y divide-border/40">
        {loading && entries.length === 0 && (
          <li className="px-4 py-6 text-center text-[12px] text-muted-foreground">Yükleniyor…</li>
        )}
        {!loading && entries.length === 0 && (
          <li className="px-4 py-6 text-center text-[12px] text-muted-foreground">
            Henüz denetim kaydı yok.
          </li>
        )}
        {entries.map((e) => {
          const isSystem = e.actor === 'system' || e.actor.startsWith('arsam-')
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => navigate(`/audit?id=${encodeURIComponent(e.id)}`)}
                aria-label={`${e.action} olayının detayını aç`}
                data-testid={`audit-entry-${e.id}`}
                className="flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition hover:bg-foreground/[0.02] focus-visible:bg-foreground/[0.04]"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-foreground/[0.06]"
                >
                  {isSystem ? (
                    <Cpu className="h-3.5 w-3.5 text-foreground/70" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-foreground/70" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-mono text-[11px] truncate">{e.action}</div>
                    <time
                      className="font-mono text-[10px] tabular-nums text-muted-foreground"
                      dateTime={e.atISO}
                      title={absoluteTime(e.atISO)}
                    >
                      {relativeTime(e.atISO)}
                    </time>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    <span className="text-foreground/80">{e.actor}</span>
                    {' · '}
                    {e.resourceType} <span className="font-mono">{e.resourceId}</span>
                  </div>
                </div>
                <span
                  aria-label={e.outcome === 'success' ? 'Başarılı' : 'Başarısız'}
                  className={cn(
                    'mt-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[10px]',
                    e.outcome === 'success'
                      ? 'bg-foreground/[0.06] text-foreground/80'
                      : 'bg-foreground/[0.12] text-foreground',
                  )}
                >
                  {e.outcome === 'success' ? (
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                  ) : (
                    <XCircle className="h-3 w-3" aria-hidden />
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
