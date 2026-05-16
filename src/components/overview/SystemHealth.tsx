// SystemHealth — sub-card for the super-admin overview dashboard.
// Wave F3 / Agent-F3D.
//
// Surface platform-wide health at a glance: 30-day uptime, last incident,
// and active alert count. Token-only, no rose / emerald.

import { useNavigate } from 'react-router'
import { AlertTriangle, Activity, ShieldCheck } from '@landx/icons'
import { cn } from '@landx/ui'
import type { Incident } from '@landx/data'

interface SystemHealthProps {
  uptime30d: number
  activeAlerts: number
  lastIncident: Pick<Incident, 'startedISO' | 'summary'> | null
}

const UPTIME_FMT = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

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

export function SystemHealth({ uptime30d, activeAlerts, lastIncident }: SystemHealthProps) {
  const navigate = useNavigate()
  const uptimePct = uptime30d * 100

  return (
    <aside className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Sağlık
          </div>
          <div className="font-serif text-base">Sistem durumu</div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/observability')}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground"
        >
          Detay →
        </button>
      </div>

      <dl className="divide-y divide-border/40 text-[13px]">
        <Row
          icon={<Activity className="h-3.5 w-3.5 text-foreground/70" />}
          label="API uptime"
          value={`${UPTIME_FMT.format(uptimePct)}%`}
          hint="son 30 gün"
        />
        <Row
          icon={<AlertTriangle className="h-3.5 w-3.5 text-foreground/70" />}
          label="Aktif uyarı"
          value={String(activeAlerts)}
          hint={activeAlerts === 0 ? 'temiz' : 'inceleme bekliyor'}
          emphasize={activeAlerts > 0}
        />
        <Row
          icon={<ShieldCheck className="h-3.5 w-3.5 text-foreground/70" />}
          label="Son olay"
          value={lastIncident ? relativeTime(lastIncident.startedISO) : '—'}
          hint={lastIncident ? lastIncident.summary : 'olay yok'}
        />
      </dl>
    </aside>
  )
}

function Row({
  icon,
  label,
  value,
  hint,
  emphasize,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  emphasize?: boolean
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg',
          emphasize ? 'bg-foreground/[0.12]' : 'bg-foreground/[0.06]',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 font-serif text-base font-light tabular-nums">{value}</dd>
        {hint && <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  )
}
