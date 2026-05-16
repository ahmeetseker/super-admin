import { useMemo, useState } from 'react'
import { ArrowDownToLine, Filter, Search, TrendingUp, Wallet } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { formatTL, formatTLCompact } from '@landx/ui'

type PaymentStatus = 'success' | 'pending' | 'failed' | 'refunded'

type Payment = {
  id: string
  invoiceNo: string
  tenantId: string
  tenantName: string
  amount: number
  status: PaymentStatus
  method: 'card' | 'bank' | 'wallet'
  createdAt: string
  description: string
}

const PAYMENTS: Payment[] = [
  { id: 'p_001', invoiceNo: 'INV-2026-0184', tenantId: 't_arsam_kadikoy', tenantName: 'Arsam Kadıköy Ofis', amount: 3990_00, status: 'success', method: 'card', createdAt: '2026-05-14T10:24:00Z', description: 'Pro plan — Mayıs aboneliği' },
  { id: 'p_002', invoiceNo: 'INV-2026-0183', tenantId: 't_landplus', tenantName: 'LandPlus Bursa', amount: 9990_00, status: 'success', method: 'bank', createdAt: '2026-05-14T08:11:00Z', description: 'Kurumsal plan — Mayıs aboneliği' },
  { id: 'p_003', invoiceNo: 'INV-2026-0182', tenantId: 't_emlak_atik', tenantName: 'Emlak Atik İzmir', amount: 1490_00, status: 'pending', method: 'card', createdAt: '2026-05-13T22:47:00Z', description: 'Başlangıç plan — Mayıs aboneliği' },
  { id: 'p_004', invoiceNo: 'INV-2026-0181', tenantId: 't_kentsel', tenantName: 'Kentsel Yapı Ankara', amount: 3990_00, status: 'failed', method: 'card', createdAt: '2026-05-13T19:02:00Z', description: 'Pro plan — kart reddedildi' },
  { id: 'p_005', invoiceNo: 'INV-2026-0180', tenantId: 't_arsa_pro', tenantName: 'ArsaPro Antalya', amount: 199_00, status: 'success', method: 'wallet', createdAt: '2026-05-13T16:33:00Z', description: 'Bireysel Plus — Mayıs üyelik' },
  { id: 'p_006', invoiceNo: 'INV-2026-0179', tenantId: 't_arsam_kadikoy', tenantName: 'Arsam Kadıköy Ofis', amount: 749_00, status: 'refunded', method: 'card', createdAt: '2026-05-12T14:15:00Z', description: 'Vitrine paket iadesi' },
  { id: 'p_007', invoiceNo: 'INV-2026-0178', tenantId: 't_genel_emlak', tenantName: 'Genel Emlak Trabzon', amount: 1490_00, status: 'success', method: 'card', createdAt: '2026-05-12T11:09:00Z', description: 'Başlangıç plan — Mayıs aboneliği' },
  { id: 'p_008', invoiceNo: 'INV-2026-0177', tenantId: 't_yeni_yatirim', tenantName: 'Yeni Yatırım Eskişehir', amount: 499_00, status: 'success', method: 'card', createdAt: '2026-05-12T09:42:00Z', description: 'Bireysel Pro — Mayıs üyelik' },
  { id: 'p_009', invoiceNo: 'INV-2026-0176', tenantId: 't_landplus', tenantName: 'LandPlus Bursa', amount: 2490_00, status: 'pending', method: 'bank', createdAt: '2026-05-11T17:28:00Z', description: 'Ek koltuk paketi (3 adet)' },
  { id: 'p_010', invoiceNo: 'INV-2026-0175', tenantId: 't_emlak_atik', tenantName: 'Emlak Atik İzmir', amount: 199_00, status: 'failed', method: 'card', createdAt: '2026-05-11T13:55:00Z', description: 'Bireysel Plus — kart süresi geçmiş' },
]

const STATUS_TONES: Record<PaymentStatus, { bg: string; fg: string; dot: string; label: string }> = {
  success: { bg: 'bg-emerald-500/10', fg: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Başarılı' },
  pending: { bg: 'bg-amber-500/10', fg: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', label: 'Bekliyor' },
  failed: { bg: 'bg-rose-500/10', fg: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', label: 'Başarısız' },
  refunded: { bg: 'bg-violet-500/10', fg: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', label: 'İade' },
}

const METHOD_LABELS: Record<Payment['method'], string> = {
  card: 'Kart',
  bank: 'Havale',
  wallet: 'Cüzdan',
}

const STATUS_FILTERS: Array<{ value: 'all' | PaymentStatus; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'success', label: 'Başarılı' },
  { value: 'pending', label: 'Bekleyen' },
  { value: 'failed', label: 'Başarısız' },
  { value: 'refunded', label: 'İade' },
]

export function Payments() {
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PAYMENTS.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (!q) return true
      return (
        p.invoiceNo.toLowerCase().includes(q) ||
        p.tenantName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      )
    })
  }, [query, statusFilter])

  const kpis = useMemo(() => {
    const success = PAYMENTS.filter((p) => p.status === 'success')
    const pending = PAYMENTS.filter((p) => p.status === 'pending')
    const refunded = PAYMENTS.filter((p) => p.status === 'refunded')
    return {
      totalRevenue: success.reduce((s, p) => s + p.amount, 0),
      pendingAmount: pending.reduce((s, p) => s + p.amount, 0),
      refundedAmount: refunded.reduce((s, p) => s + p.amount, 0),
      successCount: success.length,
    }
  }, [])

  return (
    <PageShell
      eyebrow="MOD · I02 · PAYMENTS"
      title={
        <>
          Platform <em className="font-serif italic font-light">ödemeleri</em>
        </>
      }
      description={`${PAYMENTS.length} işlem · ${kpis.successCount} başarılı · ${formatTLCompact(kpis.totalRevenue / 100)} toplam gelir.`}
      actions={
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Dışa aktar
        </button>
      }
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Toplam gelir"
          value={formatTLCompact(kpis.totalRevenue / 100)}
          hint={`${kpis.successCount} başarılı işlem`}
          tone="emerald"
        />
        <KpiCard
          icon={Wallet}
          label="Bekleyen"
          value={formatTLCompact(kpis.pendingAmount / 100)}
          hint={`${PAYMENTS.filter((p) => p.status === 'pending').length} işlem`}
          tone="amber"
        />
        <KpiCard
          icon={Wallet}
          label="İade"
          value={formatTLCompact(kpis.refundedAmount / 100)}
          hint={`${PAYMENTS.filter((p) => p.status === 'refunded').length} işlem`}
          tone="violet"
        />
        <KpiCard
          icon={Wallet}
          label="Başarısız"
          value={`${PAYMENTS.filter((p) => p.status === 'failed').length}`}
          hint="manuel inceleme gerekebilir"
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
            placeholder="Tenant / fatura no / açıklama"
            aria-label="Ödemelerde ara"
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
              onClick={() => setStatusFilter(opt.value)}
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

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
        >
          <Filter className="h-3.5 w-3.5" />
          Daha fazla filtre
        </button>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {query
            ? `"${query}" ile eşleşen ödeme yok.`
            : 'Bu filtreyle eşleşen ödeme bulunamadı.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-foreground/[0.02] font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Fatura</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Açıklama</th>
                <th className="px-4 py-3 font-medium">Yöntem</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const tone = STATUS_TONES[p.status]
                const dateFmt = new Intl.DateTimeFormat('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(p.createdAt))
                return (
                  <tr key={p.id} className="transition hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[12px] font-medium text-foreground">
                        {p.invoiceNo}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">{dateFmt}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium">{p.tenantName}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{p.tenantId}</div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">{p.description}</td>
                    <td className="px-4 py-3 text-[12px]">
                      <span className="inline-flex items-center rounded-full bg-foreground/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {METHOD_LABELS[p.method]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          'font-serif text-[14px] font-medium tabular-nums',
                          p.status === 'refunded' && 'text-violet-700 dark:text-violet-300',
                          p.status === 'failed' && 'text-muted-foreground line-through',
                        )}
                      >
                        {formatTL(p.amount / 100)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
