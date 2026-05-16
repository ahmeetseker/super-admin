import { useMemo, useState, useTransition } from 'react'
import {
  Filter,
  Gavel,
  Scale,
  Search,
  Users,
  X,
} from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  useAllDisputes,
  useResolveDispute,
  type Dispute,
} from '@landx/data'

type StatusKey = 'all' | Dispute['status']

const STATUS_FILTERS: Array<{ value: StatusKey; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'open', label: 'Açık' },
  { value: 'investigating', label: 'İncelemede' },
  { value: 'resolved', label: 'Çözüldü' },
  { value: 'rejected', label: 'Reddedildi' },
]

const CATEGORY_LABELS: Record<Dispute['category'], string> = {
  fraud: 'Dolandırıcılık',
  inappropriate: 'Uygunsuz',
  incorrect: 'Yanlış bilgi',
  other: 'Diğer',
}

const STATUS_TONES: Record<
  Dispute['status'],
  { bg: string; fg: string; label: string }
> = {
  open: {
    bg: 'bg-amber-500/10',
    fg: 'text-amber-700 dark:text-amber-300',
    label: 'Açık',
  },
  investigating: {
    bg: 'bg-violet-500/10',
    fg: 'text-violet-700 dark:text-violet-300',
    label: 'İnceleme',
  },
  resolved: {
    bg: 'bg-emerald-500/10',
    fg: 'text-emerald-700 dark:text-emerald-300',
    label: 'Çözüldü',
  },
  rejected: {
    bg: 'bg-foreground/[0.06]',
    fg: 'text-muted-foreground',
    label: 'Reddedildi',
  },
}

type Verdict = 'user_favor' | 'office_favor' | 'neutral'

const VERDICT_OPTIONS: Array<{
  value: Verdict
  label: string
  resolution: 'resolved' | 'rejected'
  defaultNote: string
}> = [
  {
    value: 'user_favor',
    label: 'Kullanıcı lehine',
    resolution: 'resolved',
    defaultNote: 'İnceleme sonucunda kullanıcı lehine karar verildi. İade/iyileştirme uygulanacak.',
  },
  {
    value: 'office_favor',
    label: 'Ofis lehine',
    resolution: 'rejected',
    defaultNote: 'İnceleme sonucunda ofis lehine karar verildi. Şikayet kapatıldı.',
  },
  {
    value: 'neutral',
    label: 'Nötr / arabulucu',
    resolution: 'resolved',
    defaultNote: 'Taraflar arasında uzlaşı sağlandı, kayıt kapatıldı.',
  },
]

export function DisputesAdmin() {
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all')
  const [query, setQuery] = useState('')
  const [, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict>('user_favor')
  const [verdictNote, setVerdictNote] = useState('')

  const filterArg = statusFilter === 'all' ? {} : { status: statusFilter }
  const { data: rows, isLoading, error } = useAllDisputes(filterArg)
  const resolveMutation = useResolveDispute()

  const filtered = useMemo(() => {
    const list = rows ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.userId.toLowerCase().includes(q) ||
        (d.listingId ?? '').toLowerCase().includes(q) ||
        (d.counterpartyId ?? '').toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    )
  }, [rows, query])

  const active = useMemo(
    () => (rows ?? []).find((d) => d.id === activeId) ?? null,
    [rows, activeId],
  )

  const kpis = useMemo(() => {
    const all = rows ?? []
    return {
      total: all.length,
      open: all.filter((d) => d.status === 'open').length,
      investigating: all.filter((d) => d.status === 'investigating').length,
      resolved: all.filter((d) => d.status === 'resolved').length,
    }
  }, [rows])

  function openDrawer(id: string) {
    setActiveId(id)
    setVerdict('user_favor')
    setVerdictNote(VERDICT_OPTIONS[0].defaultNote)
  }

  function pickVerdict(v: Verdict) {
    setVerdict(v)
    const opt = VERDICT_OPTIONS.find((o) => o.value === v)
    if (opt) setVerdictNote(opt.defaultNote)
  }

  function confirmVerdict() {
    if (!active) return
    const opt = VERDICT_OPTIONS.find((o) => o.value === verdict)
    if (!opt) return
    resolveMutation.mutate(
      {
        id: active.id,
        resolution: opt.resolution,
        note: verdictNote.trim() || opt.defaultNote,
      },
      {
        onSettled: () => setActiveId(null),
      },
    )
  }

  return (
    <PageShell
      eyebrow="MOD · I02 · DISPUTES"
      title={
        <>
          Anlaşmazlık <em className="font-serif italic font-light">paneli</em>
        </>
      }
      description={`${kpis.total} kayıt · ${kpis.open} açık · ${kpis.investigating} incelemede · ${kpis.resolved} çözüldü.`}
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={Scale}
          label="Toplam"
          value={`${kpis.total}`}
          hint="cross-tenant kayıt"
          tone="violet"
        />
        <KpiCard
          icon={Gavel}
          label="Açık"
          value={`${kpis.open}`}
          hint="karar bekliyor"
          tone="amber"
        />
        <KpiCard
          icon={Filter}
          label="İncelemede"
          value={`${kpis.investigating}`}
          hint="atanmış kayıt"
          tone="violet"
        />
        <KpiCard
          icon={Users}
          label="Çözüldü"
          value={`${kpis.resolved}`}
          hint="kapatılan kayıt"
          tone="emerald"
        />
      </section>

      <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="DSP / kullanıcı / ilan"
            aria-label="Anlaşmazlıklarda ara"
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div
          role="tablist"
          aria-label="Durum filtresi"
          className="inline-flex flex-wrap rounded-xl border border-border bg-card p-1"
        >
          {STATUS_FILTERS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === opt.value}
              onClick={() =>
                startTransition(() => setStatusFilter(opt.value))
              }
              className={cn(
                'rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition',
                statusFilter === opt.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <LoadingPlaceholder label="Anlaşmazlıklar yükleniyor…" />
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-300">
          Liste yüklenemedi. Lütfen sayfayı yenile.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {query
            ? `"${query}" ile eşleşen anlaşmazlık yok.`
            : 'Bu filtreyle eşleşen kayıt yok.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-foreground/[0.02] font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Kayıt</th>
                <th className="px-4 py-3 font-medium">Taraflar</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Özet</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => {
                const st = STATUS_TONES[d.status]
                const dateFmt = new Intl.DateTimeFormat('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(d.createdAt))
                return (
                  <tr key={d.id} className="transition hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-[12px] font-medium text-foreground">
                        {d.id}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {dateFmt} · {d.tenantId ?? 'tenant-?'}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {d.userId}
                      </div>
                      {(d.counterpartyId || d.listingId) && (
                        <div className="font-mono text-[10px] text-muted-foreground">
                          ↳ {d.counterpartyId ?? d.listingId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex items-center rounded-full bg-foreground/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {CATEGORY_LABELS[d.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-[13px] text-foreground/85">
                      <span className="line-clamp-2">{d.description}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                          st.bg,
                          st.fg,
                        )}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <button
                        type="button"
                        onClick={() => openDrawer(d.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium transition hover:bg-foreground/5"
                      >
                        Detay <span aria-hidden="true">→</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <DisputeDrawer
          dispute={active}
          verdict={verdict}
          verdictNote={verdictNote}
          onVerdict={pickVerdict}
          onNoteChange={setVerdictNote}
          onConfirm={confirmVerdict}
          onClose={() => setActiveId(null)}
          submitting={resolveMutation.isPending}
        />
      )}
    </PageShell>
  )
}

function DisputeDrawer({
  dispute,
  verdict,
  verdictNote,
  onVerdict,
  onNoteChange,
  onConfirm,
  onClose,
  submitting,
}: {
  dispute: Dispute
  verdict: Verdict
  verdictNote: string
  onVerdict: (v: Verdict) => void
  onNoteChange: (text: string) => void
  onConfirm: () => void
  onClose: () => void
  submitting: boolean
}) {
  const closed = dispute.status === 'resolved' || dispute.status === 'rejected'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-drawer-title"
      className="fixed inset-0 z-50 flex justify-end"
    >
      <div
        className="absolute inset-0 bg-foreground/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-background p-6 shadow-xl">
        <header className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {dispute.tenantId ?? 'tenant-?'} · {CATEGORY_LABELS[dispute.category]}
            </div>
            <h3
              id="dispute-drawer-title"
              className="mt-1 font-serif text-2xl tracking-tight"
            >
              {dispute.id}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg border border-border bg-card p-2 transition hover:bg-foreground/5"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <section className="mb-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Şikayet eden
            </div>
            <div className="mt-1 font-mono text-[11px]">{dispute.userId}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Karşı taraf
            </div>
            <div className="mt-1 font-mono text-[11px]">
              {dispute.counterpartyId ?? dispute.listingId ?? '—'}
            </div>
          </div>
        </section>

        <section className="mb-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Açıklama
          </div>
          <p className="mt-1 whitespace-pre-line rounded-xl border border-border bg-foreground/[0.02] p-3 text-sm leading-relaxed">
            {dispute.description}
          </p>
        </section>

        <section className="mb-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Mesaj geçmişi ({dispute.updates.length})
          </div>
          <ul className="flex flex-col gap-2">
            {dispute.updates.map((u, i) => {
              const fmt = new Intl.DateTimeFormat('tr-TR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(u.at))
              return (
                <li
                  key={`${dispute.id}-update-${i}`}
                  className={cn(
                    'rounded-xl border p-3 text-sm',
                    u.author === 'support'
                      ? 'border-violet-500/30 bg-violet-500/5'
                      : 'border-border bg-card',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    <span>{u.author === 'support' ? 'Destek' : 'Kullanıcı'}</span>
                    <span>{fmt}</span>
                  </div>
                  <p className="whitespace-pre-line text-foreground/85">{u.text}</p>
                </li>
              )
            })}
          </ul>
        </section>

        {!closed ? (
          <section className="mt-auto rounded-2xl border border-border bg-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Karar
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {VERDICT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onVerdict(opt.value)}
                  aria-pressed={verdict === opt.value}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-xs font-medium transition',
                    verdict === opt.value
                      ? 'border-foreground/20 bg-foreground/10'
                      : 'border-border bg-background hover:bg-foreground/5',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <textarea
              value={verdictNote}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={3}
              placeholder="Karar notu…"
              className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-foreground"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={submitting || !verdictNote.trim()}
                onClick={onConfirm}
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? 'Kaydediliyor…' : 'Karar ver'}
              </button>
            </div>
          </section>
        ) : (
          <section className="mt-auto rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            Bu kayıt {STATUS_TONES[dispute.status].label.toLowerCase()} olarak kapatıldı.
          </section>
        )}
      </aside>
    </div>
  )
}

const TONE_MAP = {
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-400/10',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-400/10',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:bg-rose-400/10',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 dark:bg-violet-400/10',
} as const

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Scale
  label: string
  value: string
  hint: string
  tone: keyof typeof TONE_MAP
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', TONE_MAP[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-light tracking-tight">{value}</div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  )
}

function LoadingPlaceholder({ label }: { label: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-12 text-sm text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
    </div>
  )
}
