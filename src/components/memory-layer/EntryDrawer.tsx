// Wave F12.D — memory entry detail drawer.
import { X } from '@landx/icons'
import { TYPE_LABEL, SCOPE_LABEL, type MemoryEntry } from '@/lib/platform-memory'

interface EntryDrawerProps {
  entry: MemoryEntry | null
  onClose: () => void
}

function fmtDate(ms: number): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ms)
}

export function EntryDrawer({ entry, onClose }: EntryDrawerProps) {
  if (!entry) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      data-testid="memory-entry-drawer-overlay"
    >
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="memory-entry-drawer"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Bellek kaydı
            </div>
            <div className="mt-0.5 font-mono text-[13px] tabular-nums text-foreground">
              {entry.id}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground"
            data-testid="memory-entry-drawer-close"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <section className="mb-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              İçerik
            </div>
            <p
              className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90"
              data-testid="memory-entry-drawer-content"
            >
              {entry.content}
            </p>
          </section>

          <dl className="grid grid-cols-2 gap-4 text-[12.5px]">
            <Field label="Tip" value={TYPE_LABEL[entry.type]} />
            <Field label="Scope" value={SCOPE_LABEL[entry.scope]} />
            <Field label="Agent" value={entry.agentId} mono />
            <Field label="Tenant" value={entry.tenantId ?? '—'} mono />
            <Field
              label="Erişim sayısı"
              value={entry.accessCount.toString()}
              mono
            />
            <Field label="Yaş" value={`${entry.ageDays} gün`} />
            <Field label="Oluşturuldu" value={fmtDate(entry.createdAt)} />
            <Field label="Son erişim" value={fmtDate(entry.lastAccessedAt)} />
          </dl>
        </div>
      </aside>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          mono
            ? 'mt-0.5 font-mono text-[12px] text-foreground/90'
            : 'mt-0.5 text-[13px] text-foreground/90'
        }
      >
        {value}
      </dd>
    </div>
  )
}
