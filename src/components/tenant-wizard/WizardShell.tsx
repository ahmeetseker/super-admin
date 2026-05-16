import type { ReactNode } from 'react'
import { cn } from '@landx/ui'

export interface WizardStep {
  key: string
  label: string
}

interface WizardShellProps {
  steps: ReadonlyArray<WizardStep>
  currentIndex: number
  onStepClick?: (i: number) => void
  children: ReactNode
  footer?: ReactNode
}

export function WizardShell({ steps, currentIndex, onStepClick, children, footer }: WizardShellProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Sihirbaz adımları" className="lg:sticky lg:top-4 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {steps.map((s, i) => {
            const active = i === currentIndex
            const done = i < currentIndex
            return (
              <li key={s.key} className="flex-none">
                <button
                  type="button"
                  onClick={() => onStepClick?.(i)}
                  disabled={!onStepClick || i > currentIndex}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition disabled:cursor-default',
                    active
                      ? 'bg-foreground text-background'
                      : done
                        ? 'text-foreground hover:bg-foreground/5'
                        : 'text-muted-foreground',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-5 w-5 flex-none items-center justify-center rounded-full font-mono text-[10px] tabular-nums',
                      active
                        ? 'bg-background/20 text-background'
                        : done
                          ? 'bg-foreground/10 text-foreground'
                          : 'bg-foreground/[0.06] text-muted-foreground',
                    )}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span className="truncate font-medium">{s.label}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
      <div className="min-w-0">
        <article className="rounded-2xl border border-border bg-card p-5 md:p-6">{children}</article>
        {footer && <div className="mt-4 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
