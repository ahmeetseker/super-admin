import { useMemo, useState, useTransition } from 'react'
import {
  AlertCircle,
  Check,
  Clock,
  Loader2,
  TrendingUp,
  Wallet,
  X,
} from '@landx/icons'
import { Dialog, PageShell, cn, formatTL, formatTLCompact } from '@landx/ui'
import {
  useApproveRefund,
  useRefundQueue,
  useRejectRefund,
  type RefundRequest,
  type RefundStatus,
} from '@landx/data'

type Tab = 'pending' | 'approved' | 'rejected'

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'pending', label: 'Bekleyen' },
  { value: 'approved', label: 'Onaylanan' },
  { value: 'rejected', label: 'Reddedilen' },
]

const STATUS_TONES: Record<RefundStatus, { bg: string; fg: string; dot: string; label: string }> = {
  pending: {
    bg: 'bg-amber-500/10',
    fg: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    label: 'Bekliyor',
  },
  approved: {
    bg: 'bg-emerald-500/10',
    fg: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Onaylandı',
  },
  rejected: {
    bg: 'bg-rose-500/10',
    fg: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    label: 'Reddedildi',
  },
}

type Decision = 'approve' | 'reject'

interface PendingDecision {
  refund: RefundRequest
  decision: Decision
}

export function Refunds() {
  const { data: refunds = [], isLoading } = useRefundQueue()
  const approve = useApproveRefund()
  const reject = useRejectRefund()

  const [tab, setTab] = useState<Tab>('pending')
  const [, startTransition] = useTransition()
  const [pending, setPending] = useState<PendingDecision | null>(null)
  const [note, setNote] = useState('')

  const counts = useMemo(() => {
    return {
      pending: refunds.filter((r) => r.status === 'pending').length,
      approved: refunds.filter((r) => r.status === 'approved').length,
      rejected: refunds.filter((r) => r.status === 'rejected').length,
    }
  }, [refunds])

  const visible = useMemo(
    () =>
      refunds
        .filter((r) => r.status === tab)
        .sort(
          (a, b) =>
            new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
        ),
    [refunds, tab],
  )

  const kpis = useMemo(() => {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const approvedThisWeek = refunds.filter(
      (r) =>
        r.status === 'approved' &&
        r.resolvedAt &&
        new Date(r.resolvedAt).getTime() >= weekAgo,
    )
    const pendingAmount = refunds
      .filter((r) => r.status === 'pending')
      .reduce((s, r) => s + r.amount, 0)
    return {
      pendingCount: counts.pending,
      pendingAmount,
      approvedAmountWeek: approvedThisWeek.reduce((s, r) => s + r.amount, 0),
      approvedCountWeek: approvedThisWeek.length,
    }
  }, [refunds, counts.pending])

  const closeDialog = () => {
    setPending(null)
    setNote('')
  }

  const submitDecision = () => {
    if (!pending) return
    const trimmed = note.trim()
    const action = pending.decision === 'approve' ? approve : reject
    action.mutate(
      { id: pending.refund.id, note: trimmed || undefined },
      {
        onSuccess: () => {
          closeDialog()
        },
      },
    )
  }

  const isSubmitting = approve.isPending || reject.isPending

  return (
    <PageShell
      eyebrow="MOD · I02 · REFUNDS"
      title={
        <>
          İade <em className="font-serif italic font-light">kuyruğu</em>
        </>
      }
      description={`${counts.pending} bekleyen · ${counts.approved} onaylanan · ${counts.rejected} reddedilen iade talebi.`}
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={Clock}
          label="Bekleyen"
          value={`${kpis.pendingCount}`}
          hint={`${formatTLCompact(kpis.pendingAmount / 100)} potansiyel iade`}
          tone="amber"
        />
        <KpiCard
          icon={TrendingUp}
          label="Bu hafta onay"
          value={formatTLCompact(kpis.approvedAmountWeek / 100)}
          hint={`${kpis.approvedCountWeek} talep`}
          tone="emerald"
        />
        <KpiCard
          icon={Wallet}
          label="Toplam onaylı"
          value={`${counts.approved}`}
          hint="kümülatif"
          tone="violet"
        />
        <KpiCard
          icon={AlertCircle}
          label="Toplam reddedildi"
          value={`${counts.rejected}`}
          hint="kümülatif"
          tone="rose"
        />
      </section>

      <section className="mb-5">
        <div
          role="tablist"
          aria-label="Refund durumu"
          className="inline-flex rounded-xl border border-border bg-card p-1"
        >
          {TABS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={tab === opt.value}
              onClick={() => startTransition(() => setTab(opt.value))}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition',
                tab === opt.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
              <span
                className={cn(
                  'rounded-full px-1.5 font-mono text-[10px] tabular-nums',
                  tab === opt.value ? 'bg-background/20' : 'bg-foreground/[0.06]',
                )}
              >
                {counts[opt.value]}
              </span>
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Refund kuyruğu yükleniyor…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {tab === 'pending'
            ? 'Bekleyen refund talebi yok. İyi gidiyor.'
            : tab === 'approved'
            ? 'Onaylanmış kayıt yok.'
            : 'Reddedilmiş kayıt yok.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-foreground/[0.02] font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Talep</th>
                <th className="px-4 py-3 font-medium">Kullanıcı</th>
                <th className="px-4 py-3 font-medium">Sebep</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">Tutar</th>
                <th className="px-4 py-3 text-right font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((r) => {
                const tone = STATUS_TONES[r.status]
                const requested = new Intl.DateTimeFormat('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(r.requestedAt))
                return (
                  <tr key={r.id} className="transition hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-[12px] font-medium text-foreground">
                        {r.id}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {r.paymentId} · {requested}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="font-mono text-[12px] text-foreground">{r.userId}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-[13px] text-muted-foreground">
                      <span className="line-clamp-2 max-w-md">{r.reason}</span>
                      {r.resolutionNote && (
                        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
                          not: {r.resolutionNote}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
                          tone.bg,
                          tone.fg,
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
                        {tone.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <span className="font-serif text-[14px] font-medium tabular-nums">
                        {formatTL(r.amount / 100)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {r.status === 'pending' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPending({ refund: r, decision: 'approve' })
                              setNote('')
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:opacity-90"
                          >
                            <Check className="h-3 w-3" />
                            Onayla
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPending({ refund: r, decision: 'reject' })
                              setNote('')
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-foreground/5"
                          >
                            <X className="h-3 w-3" />
                            Reddet
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {r.resolvedAt
                            ? new Intl.DateTimeFormat('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                              }).format(new Date(r.resolvedAt))
                            : '—'}
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

      <Dialog
        open={!!pending}
        onClose={() => {
          if (!isSubmitting) closeDialog()
        }}
        size="md"
        title={
          pending?.decision === 'approve'
            ? 'İade talebini onayla'
            : 'İade talebini reddet'
        }
        description={
          pending
            ? `${pending.refund.id} · ${formatTL(pending.refund.amount / 100)}`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-2 border-t border-[color:var(--glass-border)] px-4 py-3">
            <button
              type="button"
              onClick={closeDialog}
              disabled={isSubmitting}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-foreground/5 disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={submitDecision}
              disabled={isSubmitting}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition',
                pending?.decision === 'approve'
                  ? 'bg-emerald-600 hover:opacity-90'
                  : 'bg-rose-600 hover:opacity-90',
                isSubmitting && 'cursor-wait opacity-70',
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  İşleniyor…
                </>
              ) : pending?.decision === 'approve' ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Onayla
                </>
              ) : (
                <>
                  <X className="h-3.5 w-3.5" />
                  Reddet
                </>
              )}
            </button>
          </div>
        }
      >
        {pending && (
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="rounded-xl border border-border bg-foreground/[0.02] p-3 text-[12px] text-muted-foreground">
              <span className="block font-mono text-[10px] uppercase tracking-[0.12em]">
                Talep gerekçesi
              </span>
              <span className="mt-1 block text-foreground">{pending.refund.reason}</span>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {pending.decision === 'approve' ? 'Onay notu (opsiyonel)' : 'Red gerekçesi'}
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={
                  pending.decision === 'approve'
                    ? 'Müşteriye iletilecek not…'
                    : 'Reddi açıklayan kısa not…'
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </label>
          </div>
        )}
      </Dialog>
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
  icon: typeof Wallet
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
