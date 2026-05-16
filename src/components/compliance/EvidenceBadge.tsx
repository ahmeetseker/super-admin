import { Paperclip } from '@landx/icons'
import { cn } from '@landx/ui'

interface EvidenceBadgeProps {
  count: number
  lastAt?: string | null
  className?: string
}

function relTr(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'şimdi'
  if (m < 60) return `${m} dk`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} sa`
  return `${Math.floor(h / 24)} gün`
}

export function EvidenceBadge({ count, lastAt, className }: EvidenceBadgeProps) {
  const hasFiles = count > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium tabular-nums',
        hasFiles
          ? 'border-foreground/20 bg-foreground/[0.06] text-foreground'
          : 'border-dashed border-border text-muted-foreground',
        className,
      )}
      aria-label={hasFiles ? `${count} kanıt dosyası` : 'Kanıt yok'}
    >
      <Paperclip className="h-3 w-3" aria-hidden />
      {hasFiles ? (
        <>
          {count}
          {lastAt && (
            <span className="ml-1 hidden font-normal text-muted-foreground sm:inline">
              · son {relTr(lastAt)} önce
            </span>
          )}
        </>
      ) : (
        'Kanıt ekle'
      )}
    </span>
  )
}
