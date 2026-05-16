// Wave F13.B — Audit advanced filter panel (collapsible). Wraps the shared
// TimeRangePicker, an actor combobox (datalist) sourced from unique entries,
// a severity chip group, and a 300ms-debounced full-text search. Pure UI — the
// parent route owns the filter state + computes filtered results in a useMemo.

import { useEffect, useState } from 'react'
import { Filter, X } from '@landx/icons'
import TimeRangePicker from '@/components/shared/TimeRangePicker'
import type { TimeRange } from '@/lib/super-admin-time-range'

export type AuditSeverity = 'info' | 'warn' | 'error'

export interface AdvancedFilterValue {
  actor: string
  severities: AuditSeverity[]
  range: TimeRange
  fullText: string
}

export interface AdvancedFilterPanelProps {
  value: AdvancedFilterValue
  onChange: (next: AdvancedFilterValue) => void
  /** Pre-computed unique actor list, used to populate the datalist combobox. */
  actorOptions: string[]
  /** Optional initial open state — defaults to false (toggle button visible). */
  defaultOpen?: boolean
}

const SEVERITY_LABEL: Record<AuditSeverity, string> = {
  info: 'Bilgi',
  warn: 'Uyarı',
  error: 'Hata',
}

const SEVERITY_TONE: Record<AuditSeverity, string> = {
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  error: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

export function AdvancedFilterPanel({
  value,
  onChange,
  actorOptions,
  defaultOpen = false,
}: AdvancedFilterPanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [fullTextLocal, setFullTextLocal] = useState(value.fullText)

  // 300ms debounce — keeps useMemo recompute cheap on long audit logs.
  useEffect(() => {
    if (fullTextLocal === value.fullText) return
    const handle = setTimeout(() => {
      onChange({ ...value, fullText: fullTextLocal })
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullTextLocal])

  // External resets (parent clears) reflect back into local field.
  useEffect(() => {
    if (value.fullText !== fullTextLocal) setFullTextLocal(value.fullText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.fullText])

  const toggleSeverity = (sev: AuditSeverity) => {
    const set = new Set(value.severities)
    if (set.has(sev)) set.delete(sev)
    else set.add(sev)
    onChange({ ...value, severities: Array.from(set) })
  }

  const activeCount =
    (value.actor ? 1 : 0) +
    value.severities.length +
    (value.fullText.trim().length > 0 ? 1 : 0)

  return (
    <section data-testid="audit-advanced-filter" className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="audit-advanced-toggle"
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
      >
        <Filter className="h-3.5 w-3.5" />
        Gelişmiş filtre
        {activeCount > 0 && (
          <span className="rounded-full bg-foreground px-1.5 font-mono text-[10px] text-background">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="audit-advanced-panel"
          className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-2"
        >
          <div>
            <label
              htmlFor="audit-advanced-actor"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              AKTÖR
            </label>
            <div className="flex items-center gap-2">
              <input
                id="audit-advanced-actor"
                type="text"
                list="audit-advanced-actor-options"
                value={value.actor}
                onChange={(e) => onChange({ ...value, actor: e.target.value })}
                placeholder="ör. super@arsam.local"
                data-testid="audit-advanced-actor-input"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none placeholder:text-[hsl(var(--placeholder))] focus:border-foreground"
              />
              {value.actor && (
                <button
                  type="button"
                  aria-label="Aktör filtresini temizle"
                  onClick={() => onChange({ ...value, actor: '' })}
                  className="rounded-lg p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <datalist id="audit-advanced-actor-options">
              {actorOptions.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          <div>
            <label
              htmlFor="audit-advanced-fulltext"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              TAM METİN
            </label>
            <input
              id="audit-advanced-fulltext"
              type="search"
              value={fullTextLocal}
              onChange={(e) => setFullTextLocal(e.target.value)}
              placeholder="Aksiyon, kaynak, IP, metadata…"
              data-testid="audit-advanced-fulltext-input"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none placeholder:text-[hsl(var(--placeholder))] focus:border-foreground"
            />
          </div>

          <div className="md:col-span-1">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              ŞIDDET
            </span>
            <div
              role="group"
              aria-label="Şiddet filtresi"
              className="inline-flex items-center gap-1.5"
              data-testid="audit-advanced-severity"
            >
              {(['info', 'warn', 'error'] as AuditSeverity[]).map((sev) => {
                const active = value.severities.includes(sev)
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => toggleSeverity(sev)}
                    aria-pressed={active}
                    data-testid={`audit-advanced-severity-${sev}`}
                    className={
                      active
                        ? `inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${SEVERITY_TONE[sev]}`
                        : 'inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground'
                    }
                  >
                    {SEVERITY_LABEL[sev]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="md:col-span-1">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              ZAMAN ARALIĞI
            </span>
            <TimeRangePicker
              value={value.range}
              onChange={(next) => onChange({ ...value, range: next })}
              testId="audit-advanced-range"
            />
          </div>
        </div>
      )}
    </section>
  )
}

export default AdvancedFilterPanel
