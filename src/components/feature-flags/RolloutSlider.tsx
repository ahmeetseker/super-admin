// Wave F26.A — Inline rollout percentage slider/stepper.
// Lightweight, controlled. Used inline in FeatureFlagsTable and (later)
// in the CreateFlagModal. 0-100, stepper buttons (±5), keyboard arrow keys.

import { Minus, Plus } from '@landx/icons'
import { cn } from '@landx/ui'

interface Props {
  value: number
  onChange: (next: number) => void
  disabled?: boolean
  ariaLabel?: string
  testId?: string
  size?: 'sm' | 'md'
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return Math.round(n)
}

export function RolloutSlider({
  value,
  onChange,
  disabled,
  ariaLabel = 'Rollout yüzdesi',
  testId = 'rollout-slider',
  size = 'sm',
}: Props) {
  const safe = clamp(value)
  const dec = () => onChange(clamp(safe - 5))
  const inc = () => onChange(clamp(safe + 5))

  return (
    <div
      data-testid={testId}
      data-rollout-value={safe}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-1.5',
        size === 'sm' ? 'py-0.5' : 'py-1',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <button
        type="button"
        onClick={dec}
        aria-label={`${ariaLabel} azalt`}
        disabled={disabled || safe <= 0}
        className="flex h-5 w-5 flex-none items-center justify-center rounded text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={safe}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="h-1 w-20 accent-foreground"
      />
      <span
        data-testid={`${testId}-value`}
        className="min-w-[2.25rem] text-right font-mono text-[11px] tabular-nums text-foreground/85"
      >
        {safe}%
      </span>
      <button
        type="button"
        onClick={inc}
        aria-label={`${ariaLabel} arttır`}
        disabled={disabled || safe >= 100}
        className="flex h-5 w-5 flex-none items-center justify-center rounded text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

export default RolloutSlider
