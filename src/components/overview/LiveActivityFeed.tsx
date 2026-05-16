// LiveActivityFeed — Wave F29.B / mock real-time activity stream.
//
// Generates a synthetic event every `pollMs` (default 5000) using a
// 5-type rotation [login, tenant_create, plan_change, audit_failure,
// impersonate_start]. Keeps a ring buffer of the most recent 20 events
// and renders them newest-first. The "Live" badge is an emerald pulse
// while polling is active.
//
// Tests can override `pollMs={0}` to disable the interval and seed the
// initial list via `initialEvents` for deterministic snapshots.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertOctagon,
  Building2,
  CreditCard,
  Eye,
  LogIn,
} from '@landx/icons'
import type { LucideIcon } from '@landx/icons'
import { cn } from '@landx/ui'

const LIVE_ACTIVITY_POLL_MS = 5000
const LIVE_ACTIVITY_BUFFER = 20

type LiveActivityKind =
  | 'login'
  | 'tenant_create'
  | 'plan_change'
  | 'audit_failure'
  | 'impersonate_start'

export interface LiveActivityEvent {
  id: string
  kind: LiveActivityKind
  atISO: string
  actor: string
  detail: string
}

interface KindMeta {
  label: string
  icon: LucideIcon
  /** Whether this event represents a failure / risky operation. */
  warning?: boolean
}

const KIND_META: Record<LiveActivityKind, KindMeta> = {
  login: { label: 'Giriş', icon: LogIn },
  tenant_create: { label: 'Tenant oluşturma', icon: Building2 },
  plan_change: { label: 'Plan değişikliği', icon: CreditCard },
  audit_failure: { label: 'Denetim hatası', icon: AlertOctagon, warning: true },
  impersonate_start: { label: 'Impersonate başladı', icon: Eye, warning: true },
}

const ROTATION: readonly LiveActivityKind[] = [
  'login',
  'tenant_create',
  'plan_change',
  'audit_failure',
  'impersonate_start',
]

const ACTORS = [
  'ahmet.seker@turksab.com',
  'ops@landx.io',
  'system',
  'support@landx.io',
  'arsam-cron',
] as const

const DETAILS: Record<LiveActivityKind, readonly string[]> = {
  login: ['MFA ile giriş', 'SSO devamı', 'Yeni cihaz onayı'],
  tenant_create: ['Trial · Pro plan', 'Self-serve onboarding', 'Sales destekli'],
  plan_change: ['Starter → Pro', 'Pro → Enterprise', 'Yıllık taahhüt'],
  audit_failure: ['Yetkisiz endpoint', 'Token süresi doldu', 'Rate limit aşımı'],
  impersonate_start: ['Destek talebi #4821', 'Onboarding incelemesi', 'Fatura sorgusu'],
}

function pickFrom<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]
}

function makeEvent(seq: number): LiveActivityEvent {
  const kind = ROTATION[seq % ROTATION.length]
  return {
    id: `live-${seq}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    atISO: new Date().toISOString(),
    actor: pickFrom(ACTORS, seq + (kind === 'audit_failure' ? 2 : 0)),
    detail: pickFrom(DETAILS[kind], seq),
  }
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const sec = Math.max(0, Math.floor(ms / 1000))
  if (sec < 5) return 'az önce'
  if (sec < 60) return `${sec}s önce`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  return `${hr}sa önce`
}

export interface LiveActivityFeedProps {
  /** Poll interval in ms. Set to 0 to disable (tests / reduced motion). */
  pollMs?: number
  /** Seed events for deterministic tests. */
  initialEvents?: readonly LiveActivityEvent[]
}

/**
 * Mock useMockStream hook — emits a new synthetic event every `pollMs`
 * via the rotation generator and trims to the last `LIVE_ACTIVITY_BUFFER`.
 */
function useMockStream(
  pollMs: number,
  initialEvents?: readonly LiveActivityEvent[],
): LiveActivityEvent[] {
  const [events, setEvents] = useState<LiveActivityEvent[]>(() =>
    initialEvents ? [...initialEvents] : [],
  )
  const seqRef = useRef(initialEvents?.length ?? 0)

  useEffect(() => {
    if (pollMs <= 0) return
    const id = window.setInterval(() => {
      seqRef.current += 1
      const next = makeEvent(seqRef.current)
      setEvents((prev) => [next, ...prev].slice(0, LIVE_ACTIVITY_BUFFER))
    }, pollMs)
    return () => window.clearInterval(id)
  }, [pollMs])

  return events
}

export function LiveActivityFeed({
  pollMs = LIVE_ACTIVITY_POLL_MS,
  initialEvents,
}: LiveActivityFeedProps) {
  const events = useMockStream(pollMs, initialEvents)
  const isLive = pollMs > 0

  // Tick re-render every 5s so relative timestamps stay fresh even when
  // no new event arrives (e.g. after the user idles on the page).
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isLive) return
    const id = window.setInterval(() => setTick((t) => t + 1), 5000)
    return () => window.clearInterval(id)
  }, [isLive])

  const visible = useMemo(() => events.slice(0, LIVE_ACTIVITY_BUFFER), [events])

  return (
    <section
      data-testid="live-activity-feed"
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Canlı akış · mock
          </div>
          <div className="font-serif text-base">
            Anlık <em className="font-serif italic font-light">aktivite</em>
          </div>
        </div>
        <span
          data-testid="live-activity-badge"
          aria-label={isLive ? 'Canlı yayın aktif' : 'Yayın duraklatıldı'}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]',
            isLive
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-border text-muted-foreground',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'relative inline-flex h-1.5 w-1.5',
              isLive && 'before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-emerald-500/50',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'relative inline-flex h-1.5 w-1.5 rounded-full',
                isLive ? 'bg-emerald-500' : 'bg-muted-foreground/40',
              )}
            />
          </span>
          {isLive ? 'Live' : 'Idle'}
        </span>
      </header>
      <ul
        data-testid="live-activity-list"
        className="divide-y divide-border/40"
        aria-live="polite"
        aria-relevant="additions"
      >
        {visible.length === 0 && (
          <li className="px-4 py-6 text-center text-[12px] text-muted-foreground">
            Olay bekleniyor…
          </li>
        )}
        {visible.map((e) => {
          const meta = KIND_META[e.kind]
          const Icon = meta.icon
          return (
            <li
              key={e.id}
              data-testid={`live-activity-row-${e.kind}`}
              className="flex items-start gap-3 px-4 py-2.5"
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full',
                  meta.warning ? 'bg-foreground/[0.12]' : 'bg-foreground/[0.06]',
                )}
              >
                <Icon className="h-3.5 w-3.5 text-foreground/70" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-mono text-[11px] truncate">{meta.label}</div>
                  <time
                    className="font-mono text-[10px] tabular-nums text-muted-foreground"
                    dateTime={e.atISO}
                  >
                    {relativeTime(e.atISO)}
                  </time>
                </div>
                <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  <span className="text-foreground/80">{e.actor}</span>
                  {' · '}
                  {e.detail}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
