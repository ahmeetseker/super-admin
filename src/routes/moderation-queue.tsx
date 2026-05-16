import { useMemo, useState, useTransition } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  ShieldAlert,
  XCircle,
} from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  useModerationQueue,
  useResolveModeration,
  type ModerationItem,
} from '@landx/data'

type StatusKey = 'all' | ModerationItem['status']

const STATUS_FILTERS: Array<{ value: StatusKey; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'queued', label: 'Bekleyen' },
  { value: 'in_review', label: 'İncelemede' },
  { value: 'resolved', label: 'Çözüldü' },
  { value: 'dismissed', label: 'Reddedildi' },
]

const KIND_LABELS: Record<ModerationItem['kind'], string> = {
  report: 'Şikayet',
  dispute: 'Anlaşmazlık',
  flagged_listing: 'Bayrak ilan',
  user_flag: 'Kullanıcı bayrağı',
}

const SEVERITY_TONES: Record<
  ModerationItem['severity'],
  { bg: string; fg: string; dot: string; label: string }
> = {
  high: {
    bg: 'bg-rose-500/10',
    fg: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    label: 'Yüksek',
  },
  medium: {
    bg: 'bg-amber-500/10',
    fg: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    label: 'Orta',
  },
  low: {
    bg: 'bg-emerald-500/10',
    fg: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Düşük',
  },
}

const STATUS_TONES: Record<
  ModerationItem['status'],
  { bg: string; fg: string; label: string }
> = {
  queued: {
    bg: 'bg-amber-500/10',
    fg: 'text-amber-700 dark:text-amber-300',
    label: 'Sırada',
  },
  in_review: {
    bg: 'bg-violet-500/10',
    fg: 'text-violet-700 dark:text-violet-300',
    label: 'İnceleme',
  },
  resolved: {
    bg: 'bg-emerald-500/10',
    fg: 'text-emerald-700 dark:text-emerald-300',
    label: 'Çözüldü',
  },
  dismissed: {
    bg: 'bg-foreground/[0.06]',
    fg: 'text-muted-foreground',
    label: 'Reddedildi',
  },
}

const RESOLUTION_REASONS: Record<'resolved' | 'dismissed', string[]> = {
  resolved: [
    'İlan kaldırıldı',
    'Kullanıcı uyarıldı',
    'Hesap askıya alındı',
    'İçerik düzeltildi',
  ],
  dismissed: [
    'Geçersiz şikayet',
    'Yetersiz kanıt',
    'Politika ihlali yok',
    'Tekrarlayan kayıt',
  ],
}

export function ModerationQueue() {
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all')
  const [query, setQuery] = useState('')
  const [, startTransition] = useTransition()
  const [activeReason, setActiveReason] = useState<{
    id: string
    resolution: 'resolved' | 'dismissed'
  } | null>(null)
  const [reasonText, setReasonText] = useState('')

  const filterArg = statusFilter === 'all' ? {} : { status: statusFilter }
  const { data: rows, isLoading, error } = useModerationQueue(filterArg)
  const resolveMutation = useResolveModeration()

  const filtered = useMemo(() => {
    const list = rows ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (m) =>
        m.summary.toLowerCase().includes(q) ||
        m.refId.toLowerCase().includes(q) ||
        m.tenantId.toLowerCase().includes(q),
    )
  }, [rows, query])

  const kpis = useMemo(() => {
    const all = rows ?? []
    return {
      total: all.length,
      queued: all.filter((m) => m.status === 'queued').length,
      review: all.filter((m) => m.status === 'in_review').length,
      high: all.filter((m) => m.severity === 'high').length,
    }
  }, [rows])

  function openReason(id: string, resolution: 'resolved' | 'dismissed') {
    setActiveReason({ id, resolution })
    setReasonText(RESOLUTION_REASONS[resolution][0])
  }

  function confirmResolve() {
    if (!activeReason) return
    resolveMutation.mutate(
      {
        id: activeReason.id,
        resolution: activeReason.resolution,
        note: reasonText.trim() || undefined,
      },
      {
        onSettled: () => {
          setActiveReason(null)
          setReasonText('')
        },
      },
    )
  }

  return (
    <PageShell
      eyebrow="MOD · I02 · MODERATION"
      title={
        <>
          Moderasyon <em className="font-serif italic font-light">kuyruğu</em>
        </>
      }
      description={`${kpis.total} kayıt · ${kpis.queued} bekleyen · ${kpis.high} yüksek öncelik.`}
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={ShieldAlert}
          label="Toplam"
          value={`${kpis.total}`}
          hint="cross-tenant kayıt"
          tone="violet"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Bekleyen"
          value={`${kpis.queued}`}
          hint="hızlıca incele"
          tone="amber"
        />
        <KpiCard
          icon={Filter}
          label="İncelemede"
          value={`${kpis.review}`}
          hint="atanmış kayıt"
          tone="violet"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Yüksek öncelik"
          value={`${kpis.high}`}
          hint="acil gözden geçir"
          tone="rose"
        />
      </section>

      <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tenant / ref / özet"
            aria-label="Moderasyon kuyruğunda ara"
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
        <LoadingPlaceholder label="Kuyruk yükleniyor…" />
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-300">
          Kuyruk yüklenemedi. Lütfen sayfayı yenile.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {query
            ? `"${query}" ile eşleşen kayıt yok.`
            : 'Bu filtreyle eşleşen moderasyon kaydı yok.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-foreground/[0.02] font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Kayıt</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Özet</th>
                <th className="px-4 py-3 font-medium">Öncelik</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => {
                const sev = SEVERITY_TONES[m.severity]
                const st = STATUS_TONES[m.status]
                const closed = m.status === 'resolved' || m.status === 'dismissed'
                const dateFmt = new Intl.DateTimeFormat('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(m.createdAt))
                return (
                  <tr key={m.id} className="transition hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-[12px] font-medium text-foreground">
                        {m.refId}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {KIND_LABELS[m.kind]} · {dateFmt}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {m.tenantId}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-[13px] text-foreground/85">
                      {m.summary}
                      {m.resolutionNote && (
                        <div className="mt-1 text-[11px] italic text-muted-foreground">
                          Karar notu: {m.resolutionNote}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
                          sev.bg,
                          sev.fg,
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', sev.dot)} />
                        {sev.label}
                      </span>
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
                      {!closed ? (
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openReason(m.id, 'resolved')}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Onayla
                          </button>
                          <button
                            type="button"
                            onClick={() => openReason(m.id, 'dismissed')}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-500/15 dark:text-rose-300"
                          >
                            <XCircle className="h-3 w-3" /> Reddet
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          kapandı
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeReason && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="moderation-reason-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setActiveReason(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
            <h3
              id="moderation-reason-title"
              className="font-serif text-xl tracking-tight"
            >
              {activeReason.resolution === 'resolved'
                ? 'Şikayeti onayla'
                : 'Şikayeti reddet'}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Kayıt #{activeReason.id} için karar notu seç.
            </p>

            <div className="mt-4 space-y-2">
              {RESOLUTION_REASONS[activeReason.resolution].map((reason) => (
                <label
                  key={reason}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm transition hover:bg-foreground/5"
                >
                  <input
                    type="radio"
                    name="resolution-reason"
                    value={reason}
                    checked={reasonText === reason}
                    onChange={(e) => setReasonText(e.target.value)}
                    className="h-3.5 w-3.5"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={3}
              placeholder="Ek not (opsiyonel)…"
              className="mt-3 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveReason(null)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={resolveMutation.isPending}
                onClick={confirmResolve}
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {resolveMutation.isPending ? 'Gönderiliyor…' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
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
  icon: typeof ShieldAlert
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
