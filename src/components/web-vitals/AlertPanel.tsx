// Wave F12.B — AlertPanel: list of entries whose metric value exceeds the
// Google Core Web Vitals amber→red threshold. Sorted by exceedance.

import { AlertTriangle } from '@landx/icons'
import {
  getAlerts,
  THRESHOLDS,
  type VitalEntry,
} from '@/lib/platform-web-vitals'
import { formatVitalValue } from '@/components/web-vitals/MetricCards'

export interface AlertPanelProps {
  entries: VitalEntry[]
  /** Max rows to show (default 10). */
  limit?: number
}

const DATETIME_FMT = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function AlertPanel({ entries, limit = 10 }: AlertPanelProps) {
  const alerts = getAlerts(entries, limit)
  const totalCount = countRedEntries(entries)

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid="alert-panel"
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Eşik aşımı uyarıları
          </div>
          <div className="font-serif text-base">Core Web Vitals limit ihlalleri</div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-foreground"
          data-testid="alert-count"
        >
          <AlertTriangle className="h-3 w-3" aria-hidden />
          {totalCount} ihlal
        </span>
      </header>

      {alerts.length === 0 ? (
        <div
          className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
          data-testid="alert-empty"
        >
          Bu aralıkta eşik aşımı yok
        </div>
      ) : (
        <ul className="divide-y divide-border/40" data-testid="alert-list">
          {alerts.map((a) => {
            const t = THRESHOLDS[a.entry.metric]
            return (
              <li
                key={a.entry.id}
                className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                data-testid="alert-row"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground">
                      {a.entry.metric}
                    </span>
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      {a.entry.page}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {a.entry.device} · {a.entry.browser} ·{' '}
                    {DATETIME_FMT.format(a.entry.timestamp)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-base tabular-nums text-foreground">
                    {formatVitalValue(a.entry.metric, a.entry.value)}
                    {t.unit === 'ms' && (
                      <span className="ml-0.5 font-mono text-[10px] text-muted-foreground">ms</span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    eşik {formatVitalValue(a.entry.metric, t.amberMax)}
                    {t.unit === 'ms' && 'ms'} · +
                    {formatVitalValue(a.entry.metric, a.exceedBy)}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function countRedEntries(entries: VitalEntry[]): number {
  let n = 0
  for (const e of entries) {
    const t = THRESHOLDS[e.metric]
    if (e.value >= t.amberMax) n++
  }
  return n
}
