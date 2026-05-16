import { useCallback, useMemo, useState } from 'react'
import { Check, X, Eye, AlertTriangle } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { RiskBadge } from '@landx/ui/ai'
import { scoreRisk, type ImarType, type TapuType, type TkgmStatus } from '@landx/ai'

type Status = 'pending' | 'approved' | 'rejected'

interface PendingListing {
  id: string
  title: string
  city: string
  district: string
  area: number
  price: number
  ownerName: string
  submittedAt: string
  imarType: ImarType
  tapuType: TapuType
  tkgmStatus: TkgmStatus
  hisseRatio?: number
  status: Status
  reason?: string
}

const SEED: PendingListing[] = [
  {
    id: 'L-2401',
    title: 'Beykoz Acarkent · 1.250 m² konut arsa',
    city: 'İstanbul',
    district: 'Beykoz',
    area: 1250,
    price: 8_400_000,
    ownerName: 'Mehmet Yılmaz',
    submittedAt: '2026-05-13T09:14:00Z',
    imarType: 'konut',
    tapuType: 'mustakil',
    tkgmStatus: 'temiz',
    status: 'pending',
  },
  {
    id: 'L-2402',
    title: 'Çeşme Alaçatı · 4.500 m² zeytinlik (hisseli)',
    city: 'İzmir',
    district: 'Çeşme',
    area: 4500,
    price: 12_000_000,
    ownerName: 'Ayşe Demir',
    submittedAt: '2026-05-13T11:42:00Z',
    imarType: 'zeytinlik',
    tapuType: 'hisseli',
    tkgmStatus: 'ipotekli',
    hisseRatio: 50,
    status: 'pending',
  },
  {
    id: 'L-2403',
    title: 'Bodrum Yalıkavak · 850 m² ticari arsa',
    city: 'Muğla',
    district: 'Bodrum',
    area: 850,
    price: 15_500_000,
    ownerName: 'Can Aksoy',
    submittedAt: '2026-05-14T08:30:00Z',
    imarType: 'ticari',
    tapuType: 'mustakil',
    tkgmStatus: 'temiz',
    status: 'pending',
  },
  {
    id: 'L-2404',
    title: 'Kaş Çukurbağ · 3.200 m² turizm imarlı',
    city: 'Antalya',
    district: 'Kaş',
    area: 3200,
    price: 9_800_000,
    ownerName: 'Selin Kara',
    submittedAt: '2026-05-14T10:11:00Z',
    imarType: 'turizm',
    tapuType: 'mustakil',
    tkgmStatus: 'serh',
    status: 'pending',
  },
  {
    id: 'L-2405',
    title: 'Polatlı Beytepe · 9.000 m² tarla',
    city: 'Ankara',
    district: 'Polatlı',
    area: 9000,
    price: 1_800_000,
    ownerName: 'Hasan Çetin',
    submittedAt: '2026-05-14T13:55:00Z',
    imarType: 'tarim',
    tapuType: 'tarla_tapulu',
    tkgmStatus: 'bilinmiyor',
    status: 'pending',
  },
  {
    id: 'L-2406',
    title: 'Kuşadası Davutlar · 2.100 m² konut',
    city: 'Aydın',
    district: 'Kuşadası',
    area: 2100,
    price: 6_500_000,
    ownerName: 'Elif Gül',
    submittedAt: '2026-05-15T07:20:00Z',
    imarType: 'konut',
    tapuType: 'kat_irtifaki',
    tkgmStatus: 'tedbir',
    status: 'pending',
  },
]

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

export function Approvals() {
  const [items, setItems] = useState<PendingListing[]>(SEED)
  const [filter, setFilter] = useState<Filter>('pending')
  const [selected, setSelected] = useState<string | null>(null)

  const update = useCallback((id: string, status: Status, reason?: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status, reason } : it)))
    setSelected(null)
  }, [])

  const rows = useMemo(
    () => (filter === 'all' ? items : items.filter((it) => it.status === filter)),
    [items, filter],
  )

  const counts = useMemo(
    () => ({
      pending: items.filter((it) => it.status === 'pending').length,
      approved: items.filter((it) => it.status === 'approved').length,
      rejected: items.filter((it) => it.status === 'rejected').length,
      all: items.length,
    }),
    [items],
  )

  const selectedItem = items.find((it) => it.id === selected) ?? null

  return (
    <PageShell
      eyebrow="MOD · APPROVALS"
      title={
        <>
          Onay <em className="font-serif italic font-light">kuyruğu</em>
        </>
      }
      description={`${counts.pending} ilan bekliyor · ${counts.approved} onaylandı · ${counts.rejected} reddedildi. AI risk skoru otomatik hesaplanır.`}
    >
      <section className="mb-5 flex flex-wrap items-center gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((k) => {
          const label =
            k === 'pending'
              ? 'Bekliyor'
              : k === 'approved'
                ? 'Onaylandı'
                : k === 'rejected'
                  ? 'Reddedildi'
                  : 'Hepsi'
          const active = filter === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              data-testid={`approvals-filter-${k}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              <span className="font-mono text-[10px] tabular-nums opacity-70">{counts[k]}</span>
            </button>
          )
        })}
      </section>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
          Bu filtrede ilan yok.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((it) => {
            const risk = scoreRisk({
              tkgmStatus: it.tkgmStatus,
              tapuType: it.tapuType,
              imarType: it.imarType,
              hisseRatio: it.hisseRatio,
            })
            return (
              <li
                key={it.id}
                data-testid="approval-row"
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">{it.id}</span>
                    <span className="font-medium">{it.title}</span>
                    <RiskBadge result={risk} size="sm" />
                    {it.status !== 'pending' && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
                          it.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                        )}
                      >
                        {it.status === 'approved' ? 'Onaylı' : 'Reddedildi'}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    {it.ownerName} · {it.area} m² · ₺{it.price.toLocaleString('tr-TR')} ·{' '}
                    {new Date(it.submittedAt).toLocaleString('tr-TR')}
                  </div>
                  {it.reason && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="h-3 w-3" />
                      Sebep: {it.reason}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelected(it.id)}
                    data-testid={`approval-view-${it.id}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-foreground/5"
                  >
                    <Eye className="h-3 w-3" />
                    İncele
                  </button>
                  {it.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => update(it.id, 'approved')}
                        data-testid={`approval-approve-${it.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        <Check className="h-3 w-3" />
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt('Reddetme sebebi:')
                          if (reason !== null) update(it.id, 'rejected', reason || 'belirtilmedi')
                        }}
                        data-testid={`approval-reject-${it.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        <X className="h-3 w-3" />
                        Reddet
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {selectedItem && (
        <ApprovalDrawer
          item={selectedItem}
          onClose={() => setSelected(null)}
          onApprove={() => update(selectedItem.id, 'approved')}
          onReject={(reason) => update(selectedItem.id, 'rejected', reason)}
        />
      )}
    </PageShell>
  )
}

function ApprovalDrawer({
  item,
  onClose,
  onApprove,
  onReject,
}: {
  item: PendingListing
  onClose: () => void
  onApprove: () => void
  onReject: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const risk = scoreRisk({
    tkgmStatus: item.tkgmStatus,
    tapuType: item.tapuType,
    imarType: item.imarType,
    hisseRatio: item.hisseRatio,
  })

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {item.id}
            </div>
            <h2 className="mt-1 font-serif text-lg font-medium">{item.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-foreground/5"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Risk değerlendirmesi
            </div>
            <div className="mt-2">
              <RiskBadge result={risk} size="lg" showReasons />
            </div>
            <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
              {risk.reasons.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-[12px]">
            <Field label="Konum" value={`${item.district}, ${item.city}`} />
            <Field label="Alan" value={`${item.area} m²`} />
            <Field label="Fiyat" value={`₺${item.price.toLocaleString('tr-TR')}`} />
            <Field label="Tapu" value={item.tapuType} />
            <Field label="İmar" value={item.imarType} />
            <Field label="TKGM" value={item.tkgmStatus} />
            {item.hisseRatio && <Field label="Hisse" value={`%${item.hisseRatio}`} />}
            <Field label="Satıcı" value={item.ownerName} />
          </dl>

          <div>
            <label
              htmlFor="reject-reason"
              className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Reddetme sebebi (opsiyonel)
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              placeholder="örn: TKGM ipotekli, satıcıdan açıklama bekleniyor"
            />
          </div>
        </div>

        <footer className="flex items-center gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={() => onReject(reason || 'belirtilmedi')}
            className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Reddet
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Onayla
          </button>
        </footer>
      </aside>
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  )
}
