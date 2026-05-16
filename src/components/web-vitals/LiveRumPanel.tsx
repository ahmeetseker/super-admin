// LiveRumPanel — Wave F25.B (Agent F25.B).
//
// Reads the public-site web-vitals client buffer from
// `localStorage['arsam.web-vitals.recent.v1']`, polling every 5s (and on the
// browser `storage` event for cross-tab updates). Shows up to 50 entries with
// name/value/rating/url/timestamp + a name + rating filter and a clear button.
//
// Shape mirrors apps/public-site/src/lib/web-vitals-client.ts:
//   { name, value, rating, url, timestamp }
// Spec ("page" / "capturedAt") was reconciled to the real public-site contract
// so the bridge round-trips deterministically.

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@landx/ui'

export const WEB_VITALS_STORAGE_KEY = 'arsam.web-vitals.recent.v1'
export const LIVE_RUM_POLL_MS = 5000
export const LIVE_RUM_DISPLAY_LIMIT = 50

export type LiveRumName = 'CLS' | 'INP' | 'LCP' | 'FCP' | 'TTFB'
export type LiveRumRating = 'good' | 'needs-improvement' | 'poor'

export interface LiveRumEntry {
  name: LiveRumName
  value: number
  rating: LiveRumRating
  url: string
  timestamp: string
}

const METRIC_NAMES: readonly LiveRumName[] = ['CLS', 'INP', 'LCP', 'FCP', 'TTFB']
const RATINGS: readonly LiveRumRating[] = ['good', 'needs-improvement', 'poor']

function isLiveRumEntry(value: unknown): value is LiveRumEntry {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.name === 'string' &&
    METRIC_NAMES.includes(v.name as LiveRumName) &&
    typeof v.value === 'number' &&
    typeof v.rating === 'string' &&
    RATINGS.includes(v.rating as LiveRumRating) &&
    typeof v.url === 'string' &&
    typeof v.timestamp === 'string'
  )
}

export function readLiveRumBuffer(): LiveRumEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(WEB_VITALS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isLiveRumEntry)
  } catch {
    return []
  }
}

export function clearLiveRumBuffer(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(WEB_VITALS_STORAGE_KEY)
  } catch {
    // quota / private mode — no-op
  }
}

function formatMetricValue(name: LiveRumName, value: number): string {
  if (name === 'CLS') return value.toFixed(3)
  // INP/LCP/FCP/TTFB are milliseconds.
  return `${Math.round(value)} ms`
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const RATING_CLASS: Record<LiveRumRating, string> = {
  good: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'needs-improvement': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  poor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

const RATING_LABEL: Record<LiveRumRating, string> = {
  good: 'good',
  'needs-improvement': 'needs',
  poor: 'poor',
}

export interface LiveRumPanelProps {
  /** Override poll interval (ms). Defaults to 5000. Tests set 0 to skip polling. */
  pollMs?: number
}

export function LiveRumPanel({ pollMs = LIVE_RUM_POLL_MS }: LiveRumPanelProps) {
  const [entries, setEntries] = useState<LiveRumEntry[]>(() => readLiveRumBuffer())
  const [nameFilter, setNameFilter] = useState<LiveRumName | 'all'>('all')
  const [ratingFilter, setRatingFilter] = useState<LiveRumRating | 'all'>('all')

  useEffect(() => {
    function refresh() {
      setEntries(readLiveRumBuffer())
    }
    refresh()

    let intervalId: ReturnType<typeof setInterval> | undefined
    if (pollMs > 0) {
      intervalId = setInterval(refresh, pollMs)
    }

    function onStorage(event: StorageEvent) {
      if (event.key === null || event.key === WEB_VITALS_STORAGE_KEY) {
        refresh()
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage)
    }

    return () => {
      if (intervalId !== undefined) clearInterval(intervalId)
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage)
      }
    }
  }, [pollMs])

  const filtered = useMemo(() => {
    const list = entries
      .filter((e) => (nameFilter === 'all' ? true : e.name === nameFilter))
      .filter((e) => (ratingFilter === 'all' ? true : e.rating === ratingFilter))
    // Newest first; cap display.
    return [...list].reverse().slice(0, LIVE_RUM_DISPLAY_LIMIT)
  }, [entries, nameFilter, ratingFilter])

  function handleClear() {
    clearLiveRumBuffer()
    setEntries([])
  }

  return (
    <section data-testid="live-rum-panel" className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg">
            Live <em className="font-serif italic font-light">RUM</em>
          </h2>
          <p className="text-xs text-muted-foreground">
            <code className="font-mono text-[10px]">{WEB_VITALS_STORAGE_KEY}</code>{' '}
            buffer — {entries.length} örnek, son 50 gösterilir.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          disabled={entries.length === 0}
          data-testid="live-rum-clear"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Temizle
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3" data-testid="live-rum-filters">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Metric
          </span>
          {(['all', ...METRIC_NAMES] as const).map((m) => {
            const active = nameFilter === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setNameFilter(m)}
                data-testid={`live-rum-name-${m}`}
                aria-pressed={active}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'all' ? 'Tümü' : m}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Rating
          </span>
          {(['all', ...RATINGS] as const).map((r) => {
            const active = ratingFilter === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRatingFilter(r)}
                data-testid={`live-rum-rating-${r}`}
                aria-pressed={active}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {r === 'all' ? 'Tümü' : r}
              </button>
            )
          })}
        </div>
      </div>

      {entries.length === 0 ? (
        <div
          data-testid="live-rum-empty"
          className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground"
        >
          Henüz Live RUM verisi yok. Public-site’i ziyaret ettiğinizde
          metrikler{' '}
          <code className="font-mono text-[10px]">{WEB_VITALS_STORAGE_KEY}</code>{' '}
          altında görünmeye başlar.
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-testid="live-rum-filtered-empty"
          className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground"
        >
          Seçili filtre kapsamında örnek yok.
        </div>
      ) : (
        <ol
          data-testid="live-rum-list"
          className="divide-y divide-border rounded-xl border border-border bg-card"
        >
          {filtered.map((entry, idx) => (
            <li
              key={`${entry.timestamp}-${entry.name}-${idx}`}
              data-testid="live-rum-row"
              className="grid grid-cols-[80px_120px_88px_1fr_auto] items-center gap-3 px-4 py-2 text-sm"
            >
              <span className="font-mono text-xs font-medium">{entry.name}</span>
              <span className="font-mono text-xs tabular-nums">
                {formatMetricValue(entry.name, entry.value)}
              </span>
              <span
                data-testid={`live-rum-badge-${entry.rating}`}
                className={cn(
                  'inline-flex justify-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]',
                  RATING_CLASS[entry.rating],
                )}
              >
                {RATING_LABEL[entry.rating]}
              </span>
              <span className="truncate text-xs text-muted-foreground" title={entry.url}>
                {entry.url}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {formatTimestamp(entry.timestamp)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default LiveRumPanel
