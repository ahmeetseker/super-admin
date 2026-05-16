// Wave F26.B — /i18n missing-translation filter chip.
// Cycles between "all", "missing-en", "missing-tr" so operators can isolate
// gaps without an extra dropdown. Pure controlled component.

import { AlertCircle } from '@landx/icons'
import { cn } from '@landx/ui'

export type MissingFilterValue = 'all' | 'missing-en' | 'missing-tr'

export interface MissingFilterProps {
  value: MissingFilterValue
  onChange: (next: MissingFilterValue) => void
  missingEnCount: number
  missingTrCount: number
}

const OPTIONS: { value: MissingFilterValue; label: string }[] = [
  { value: 'all', label: 'Hepsi' },
  { value: 'missing-en', label: 'Eksik EN' },
  { value: 'missing-tr', label: 'Eksik TR' },
]

export default function MissingFilter({
  value,
  onChange,
  missingEnCount,
  missingTrCount,
}: MissingFilterProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/40 p-0.5"
      data-testid="i18n-missing-filter"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value
        const badge =
          opt.value === 'missing-en'
            ? missingEnCount
            : opt.value === 'missing-tr'
              ? missingTrCount
              : null
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            data-testid={`i18n-missing-filter-${opt.value}`}
            data-active={active ? 'true' : 'false'}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] transition',
              active
                ? 'bg-foreground text-background'
                : 'text-foreground/75 hover:bg-foreground/[0.04]',
            )}
          >
            {opt.value !== 'all' && <AlertCircle className="h-3 w-3" />}
            {opt.label}
            {badge !== null && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-px font-mono text-[10px] tabular-nums',
                  active ? 'bg-background/20' : 'bg-foreground/10',
                )}
              >
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
