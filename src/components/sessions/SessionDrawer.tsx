// Wave F12.A — Session detail drawer with mock action log.
import { useEffect } from 'react'
import { X } from '@landx/icons'
import { TENANTS } from '@landx/data'
import {
  ACTOR_TYPE_LABEL,
  STATUS_LABEL,
  getSessionActions,
  type PlatformSession,
} from '@/lib/platform-sessions'

const DATE_FMT = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function tenantName(id: string): string {
  return TENANTS.find((t) => t.id === id)?.name ?? id
}

export interface SessionDrawerProps {
  session: PlatformSession | null
  onClose: () => void
}

export default function SessionDrawer({ session, onClose }: SessionDrawerProps) {
  useEffect(() => {
    if (!session) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [session, onClose])

  if (!session) return null
  const actions = getSessionActions(session)

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/30"
      onClick={onClose}
      data-testid="session-drawer-overlay"
    >
      <aside
        className="h-full w-full max-w-md overflow-y-auto bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Oturum detay"
        data-testid="session-drawer"
      >
        <header className="sticky top-0 flex items-start justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Oturum detay
            </div>
            <div className="font-serif text-lg font-light">{session.actorName}</div>
            <div className="font-mono text-[10.5px] text-muted-foreground">{session.id}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-foreground/[0.05]"
            aria-label="Kapat"
            data-testid="session-drawer-close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <section className="grid grid-cols-2 gap-3 border-b border-border p-4 text-[12px]">
          <Field label="Durum" value={STATUS_LABEL[session.status]} />
          <Field label="Aktör tipi" value={ACTOR_TYPE_LABEL[session.actorType]} />
          <Field label="Kiracı" value={tenantName(session.tenantId)} />
          <Field label="Eylem sayısı" value={String(session.actionCount)} />
          <Field label="Başladı" value={DATE_FMT.format(session.startedAt)} />
          <Field
            label="Bitti"
            value={session.endedAt ? DATE_FMT.format(session.endedAt) : 'devam ediyor'}
          />
        </section>

        <section className="p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Eylem günlüğü
          </div>
          <ol className="space-y-2" data-testid="session-drawer-actions">
            {actions.map((a, idx) => (
              <li
                key={`${a.ts}-${idx}`}
                className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2"
                data-testid={`session-action-${idx}`}
              >
                <span className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {DATE_FMT.format(a.ts)}
                </span>
                <span className="text-[12px] font-medium">{a.kind}</span>
                <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">{a.target}</span>
              </li>
            ))}
            {actions.length === 0 && (
              <li className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted-foreground">
                Bu oturumda eylem yok.
              </li>
            )}
          </ol>
        </section>
      </aside>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[13px] text-foreground/90">{value}</div>
    </div>
  )
}
