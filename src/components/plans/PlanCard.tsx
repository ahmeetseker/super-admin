import { Check, GripVertical, Pencil, Trash2 } from '@landx/icons'
import { cn, formatTL } from '@landx/ui'
import type { PlatformPlan, PlanTier } from '@/lib/platform-plans'

const TIER_ACCENT: Record<PlanTier, { ring: string; pill: string; bar: string; label: string }> = {
  free: {
    ring: 'border-border',
    pill: 'bg-foreground/5 text-foreground/70',
    bar: 'bg-foreground/40',
    label: 'Ücretsiz',
  },
  pro: {
    ring: 'border-violet-500/40 ring-2 ring-violet-500/20',
    pill: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    bar: 'bg-violet-500',
    label: 'Pro',
  },
  premium: {
    ring: 'border-amber-500/40',
    pill: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    bar: 'bg-amber-500',
    label: 'Premium',
  },
  custom: {
    ring: 'border-foreground/30',
    pill: 'bg-foreground text-background',
    bar: 'bg-foreground',
    label: 'Kurumsal',
  },
}

function fmtLimit(v: number): string {
  if (v === -1) return 'Sınırsız'
  return v.toLocaleString('tr-TR')
}

interface PlanCardProps {
  plan: PlatformPlan
  tenantCount: number
  onEdit: (plan: PlatformPlan) => void
  onDelete: (plan: PlatformPlan) => void
  onDragStart: (id: string) => void
  onDragOver: (id: string, e: React.DragEvent) => void
  onDrop: (id: string) => void
  isDragging: boolean
  isDragOver: boolean
}

export function PlanCard({
  plan,
  tenantCount,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver,
}: PlanCardProps) {
  const accent = TIER_ACCENT[plan.tier]
  const priceLabel =
    plan.tier === 'custom' && plan.priceMonthly === 0
      ? 'Teklif al'
      : plan.priceMonthly === 0
        ? 'Ücretsiz'
        : formatTL(plan.priceMonthly)
  const topFeatures = plan.features.slice(0, 3)
  const remainingFeatures = Math.max(0, plan.features.length - topFeatures.length)

  return (
    <article
      data-plan-id={plan.id}
      data-testid={`plan-card-${plan.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', plan.id)
        onDragStart(plan.id)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOver(plan.id, e)
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(plan.id)
      }}
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-card p-6 transition',
        accent.ring,
        !plan.isActive && 'opacity-60',
        isDragging && 'opacity-50',
        isDragOver && 'ring-2 ring-foreground/40',
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]',
                accent.pill,
              )}
            >
              {accent.label}
            </span>
            {!plan.isActive && (
              <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                pasif
              </span>
            )}
          </div>
          <h3 className="mt-2 font-serif text-2xl font-light tracking-tight">{plan.name}</h3>
        </div>
        <button
          type="button"
          aria-label="Sıralamayı sürükle"
          className="flex h-7 w-7 flex-none cursor-grab items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground active:cursor-grabbing"
          tabIndex={-1}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mb-4 flex items-baseline gap-1.5">
        <span className="font-serif text-3xl font-light tabular-nums">{priceLabel}</span>
        {plan.priceMonthly > 0 && (
          <span className="text-[12px] text-muted-foreground">/ ay</span>
        )}
      </div>

      <ul className="mb-4 space-y-1.5">
        {topFeatures.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px]">
            <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-700 dark:text-emerald-300" />
            <span>{f}</span>
          </li>
        ))}
        {remainingFeatures > 0 && (
          <li className="pl-5 text-[12px] text-muted-foreground">+ {remainingFeatures} özellik daha</li>
        )}
      </ul>

      <div className="mb-4 rounded-xl border border-border bg-background/60 p-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Limitler
        </div>
        <dl className="grid grid-cols-3 gap-x-2 gap-y-1 text-[12px]">
          <div>
            <dt className="text-muted-foreground">İlan</dt>
            <dd className="tabular-nums">{fmtLimit(plan.limits.listings)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Kullanıcı</dt>
            <dd className="tabular-nums">{fmtLimit(plan.limits.users)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Depo</dt>
            <dd className="tabular-nums">
              {plan.limits.storageGb === -1 ? 'Sınırsız' : `${plan.limits.storageGb} GB`}
            </dd>
          </div>
        </dl>
      </div>

      <footer className="mt-auto flex items-center justify-between border-t border-border pt-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Aktif ofis
          </div>
          <div className="font-serif text-lg font-light tabular-nums">{tenantCount}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(plan)}
            aria-label={`${plan.name} planını düzenle`}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
            Düzenle
          </button>
          <button
            type="button"
            onClick={() => onDelete(plan)}
            aria-label={`${plan.name} planını sil`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </footer>
    </article>
  )
}
