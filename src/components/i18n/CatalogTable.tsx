// Wave F26.B — i18n catalog table with TR + EN inline edit.
// Click-to-edit pattern: each TR / EN cell renders an <input> that commits
// on blur or Enter and reverts on Escape. The reset action drops the
// localStorage override and falls back to the seed value.

import { useCallback, useState } from 'react'
import { RotateCcw } from '@landx/icons'
import { cn } from '@landx/ui'

import type { LocalizedString } from '@/lib/i18n-catalog'

export interface CatalogTableProps {
  rows: LocalizedString[]
  onUpdate: (key: string, patch: { tr?: string; en?: string }) => void
  onReset: (key: string) => void
}

interface InlineCellProps {
  rowKey: string
  field: 'tr' | 'en'
  value: string
  onCommit: (next: string) => void
}

// InlineCell is intentionally uncontrolled-ish: the parent re-keys it on each
// external value change (see `key={`${field}:${row.key}:${row[field]}`}`), so
// React remounts a fresh draft instead of needing a sync effect.
function InlineCell({ rowKey, field, value, onCommit }: InlineCellProps) {
  const [draft, setDraft] = useState(value)

  const commit = useCallback(() => {
    const next = draft.trim()
    if (next !== value) onCommit(next)
  }, [draft, value, onCommit])

  const isMissing = !value || value.trim().length === 0

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          ;(e.target as HTMLInputElement).blur()
        } else if (e.key === 'Escape') {
          setDraft(value)
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      data-testid={`i18n-cell-${field}-${rowKey}`}
      data-missing={isMissing ? 'true' : 'false'}
      className={cn(
        'w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-[12.5px] text-foreground transition',
        'hover:border-border focus:border-foreground/40 focus:bg-background/60 focus:outline-none',
        isMissing && 'border-rose-400/40 bg-rose-500/[0.04] text-rose-600 dark:text-rose-300',
      )}
      placeholder={isMissing ? '— eksik —' : undefined}
    />
  )
}

export default function CatalogTable({ rows, onUpdate, onReset }: CatalogTableProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid="i18n-catalog-table"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-background/30">
            <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-2.5">Key</th>
              <th className="px-3 py-2.5">Namespace</th>
              <th className="px-3 py-2.5">TR</th>
              <th className="px-3 py-2.5">EN</th>
              <th className="px-3 py-2.5 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr
                key={row.key}
                data-testid="i18n-row"
                data-key={row.key}
                data-modified={row.modifiedISO ? 'true' : 'false'}
                className="transition hover:bg-foreground/[0.02]"
              >
                <td className="px-3 py-2 font-mono text-[12px] text-foreground/85">
                  {row.key}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center rounded-full bg-foreground/[0.06] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                    {row.namespace}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <InlineCell
                    key={`tr:${row.key}:${row.tr}`}
                    rowKey={row.key}
                    field="tr"
                    value={row.tr}
                    onCommit={(next) => onUpdate(row.key, { tr: next })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <InlineCell
                    key={`en:${row.key}:${row.en}`}
                    rowKey={row.key}
                    field="en"
                    value={row.en}
                    onCommit={(next) => onUpdate(row.key, { en: next })}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onReset(row.key)}
                    disabled={!row.modifiedISO}
                    data-testid={`i18n-reset-${row.key}`}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] transition',
                      row.modifiedISO
                        ? 'text-foreground/80 hover:bg-foreground/[0.04]'
                        : 'cursor-not-allowed text-muted-foreground/50',
                    )}
                    title={row.modifiedISO ? 'Override sıfırla' : 'Override yok'}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                  data-testid="i18n-empty-state"
                >
                  Bu filtrelerle eşleşen string yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
