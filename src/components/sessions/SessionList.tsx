// Wave F12.A — Session list table.
import { ChevronRight } from '@landx/icons'
import { TENANTS } from '@landx/data'
import {
  ACTOR_TYPE_LABEL,
  STATUS_LABEL,
  type PlatformSession,
} from '@/lib/platform-sessions'

const DATE_FMT = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const STATUS_TONE: Record<PlatformSession['status'], string> = {
  active: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  expired: 'bg-stone-500/10 text-stone-700 dark:text-stone-300',
  revoked: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

function tenantName(id: string): string {
  return TENANTS.find((t) => t.id === id)?.name ?? id
}

function durationLabel(s: PlatformSession): string {
  if (!s.endedAt) return 'devam ediyor'
  const ms = s.endedAt - s.startedAt
  const min = Math.floor(ms / 60_000)
  if (min < 1) return `${Math.round(ms / 1000)}s`
  if (min < 60) return `${min}d`
  const hr = Math.floor(min / 60)
  const rem = min % 60
  return rem > 0 ? `${hr}sa ${rem}d` : `${hr}sa`
}

export interface SessionListProps {
  sessions: readonly PlatformSession[]
  onOpen: (session: PlatformSession) => void
}

export default function SessionList({ sessions, onOpen }: SessionListProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card" data-testid="sessions-list">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-background/30">
            <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-2.5">Başlangıç</th>
              <th className="px-3 py-2.5 min-w-[180px]">Aktör</th>
              <th className="px-3 py-2.5">Kiracı</th>
              <th className="px-3 py-2.5">Tip</th>
              <th className="px-3 py-2.5">Durum</th>
              <th className="px-3 py-2.5 text-right">Eylem</th>
              <th className="px-3 py-2.5 text-right">Süre</th>
              <th className="px-3 py-2.5 text-right"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((s) => (
              <tr key={s.id} data-testid={`sessions-row-${s.id}`} className="hover:bg-foreground/[0.02]">
                <td className="px-3 py-3 align-top">
                  <div className="text-[12px] text-foreground/85">{DATE_FMT.format(s.startedAt)}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{s.id}</div>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="text-[12.5px] text-foreground/90">{s.actorName}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{s.actorId}</div>
                </td>
                <td className="px-3 py-3 align-top text-[12px] text-foreground/80">
                  {tenantName(s.tenantId)}
                </td>
                <td className="px-3 py-3 align-top text-[12px] text-foreground/80">
                  {ACTOR_TYPE_LABEL[s.actorType]}
                </td>
                <td className="px-3 py-3 align-top">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium ${STATUS_TONE[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </td>
                <td className="px-3 py-3 text-right align-top font-mono text-[11.5px] tabular-nums">
                  {s.actionCount}
                </td>
                <td className="px-3 py-3 text-right align-top font-mono text-[11.5px] tabular-nums">
                  {durationLabel(s)}
                </td>
                <td className="px-3 py-3 text-right align-top">
                  <button
                    type="button"
                    onClick={() => onOpen(s)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11.5px] font-medium hover:bg-foreground/[0.04]"
                    data-testid={`sessions-open-${s.id}`}
                  >
                    Detay <ChevronRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <div className="p-10 text-center text-[13px] text-muted-foreground" data-testid="sessions-list-empty">
            Filtre eşleşmesi yok.
          </div>
        )}
      </div>
    </div>
  )
}
