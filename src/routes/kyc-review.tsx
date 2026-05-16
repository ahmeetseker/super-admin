import { useMemo, useState, useTransition } from 'react'
import { Check, X, Eye, FileText, User, Building2 } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { useApproveKyc, useKycQueue, useRejectKyc } from '@landx/data'
import type { KycReviewItem, KycReviewStatus } from '@landx/data'

type Filter = 'pending' | 'approved' | 'rejected'

const FILTER_LABEL: Record<Filter, string> = {
  pending: 'Bekleyen',
  approved: 'Onaylanan',
  rejected: 'Reddedilen',
}

function StatusPill({ status }: { status: KycReviewStatus }) {
  const map = {
    pending: { label: 'Bekliyor', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    approved: { label: 'Onaylı', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    rejected: { label: 'Reddedildi', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  } as const
  const item = map[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        item.cls,
      )}
    >
      {item.label}
    </span>
  )
}

/**
 * /kyc-review — Wave F32 / W3C.
 *
 * Manuel KYC kuyruğu (cross-tenant). Tab: Bekleyen | Onaylanan | Reddedilen.
 * Liste: kullanıcı/ofis adı, tip (bireysel/kurumsal), yüklenen belgeler
 * önizleme, "Onayla" / "Reddet (sebep)" butonları.
 */
export function KycReview() {
  const [filter, setFilter] = useState<Filter>('pending')
  const [, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 3 ayrı sorgu — tab sayısı için filter'ı sayfada lokal olarak ayrıştırıyoruz.
  const allQ = useKycQueue()
  const approveMutation = useApproveKyc()
  const rejectMutation = useRejectKyc()

  const counts = useMemo(() => {
    const all = allQ.data ?? []
    return {
      pending: all.filter((k) => k.status === 'pending').length,
      approved: all.filter((k) => k.status === 'approved').length,
      rejected: all.filter((k) => k.status === 'rejected').length,
    }
  }, [allQ.data])

  const rows = useMemo(() => {
    const all = allQ.data ?? []
    return all.filter((k) => k.status === filter)
  }, [allQ.data, filter])

  const selected = useMemo<KycReviewItem | null>(() => {
    if (!selectedId) return null
    return (allQ.data ?? []).find((k) => k.id === selectedId) ?? null
  }, [allQ.data, selectedId])

  const handleApprove = (id: string) => {
    startTransition(() => {
      approveMutation.mutate({ id })
    })
  }

  const handleReject = (id: string) => {
    const reason = window.prompt('Reddetme sebebi:')
    if (reason === null) return
    startTransition(() => {
      rejectMutation.mutate({ id, note: reason || 'belirtilmedi' })
    })
  }

  return (
    <PageShell
      eyebrow="MOD · KYC REVIEW"
      title={
        <>
          KYC <em className="font-serif italic font-light">kuyruğu</em>
        </>
      }
      description={`${counts.pending} bekliyor · ${counts.approved} onaylandı · ${counts.rejected} reddedildi. Bireysel ve kurumsal başvurular cross-tenant listelenir.`}
    >
      {/* Filter tabs */}
      <section className="mb-5 flex flex-wrap items-center gap-2" role="tablist" aria-label="KYC filter">
        {(['pending', 'approved', 'rejected'] as const).map((k) => {
          const active = filter === k
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => startTransition(() => setFilter(k))}
              data-testid={`kyc-filter-${k}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {FILTER_LABEL[k]}
              <span className="font-mono text-[10px] tabular-nums opacity-70">{counts[k]}</span>
            </button>
          )
        })}
      </section>

      {allQ.isPending ? (
        <div role="status" aria-busy="true" className="animate-pulse space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-foreground/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div
          data-testid="kyc-empty"
          className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground"
        >
          Bu filtrede başvuru yok.
        </div>
      ) : (
        <ul className="space-y-2" data-testid="kyc-queue">
          {rows.map((it) => {
            const TypeIcon = it.kind === 'office' ? Building2 : User
            return (
              <li
                key={it.id}
                data-testid="kyc-row"
                data-kyc-id={it.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5">
                  <TypeIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {it.id}
                    </span>
                    <span className="font-medium">{it.subjectName}</span>
                    <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {it.kind === 'office' ? 'Kurumsal' : 'Bireysel'}
                    </span>
                    <StatusPill status={it.status} />
                  </div>
                  <div className="mt-1 inline-flex items-center gap-3 text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {it.documentCount} belge
                    </span>
                    <span>· {new Date(it.submittedAt).toLocaleString('tr-TR')}</span>
                    {it.tenantId && (
                      <span className="font-mono tabular-nums">· tenant: {it.tenantId}</span>
                    )}
                  </div>
                  {it.rejectionReason && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-rose-700 dark:text-rose-300">
                      Sebep: {it.rejectionReason}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedId(it.id)}
                    data-testid={`kyc-view-${it.id}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-foreground/5"
                  >
                    <Eye className="h-3 w-3" />
                    İncele
                  </button>
                  {it.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(it.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`kyc-approve-${it.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" />
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(it.id)}
                        disabled={rejectMutation.isPending}
                        data-testid={`kyc-reject-${it.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
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

      {selected && (
        <KycDrawer
          item={selected}
          onClose={() => setSelectedId(null)}
          onApprove={() => {
            handleApprove(selected.id)
            setSelectedId(null)
          }}
          onReject={(reason) => {
            startTransition(() => {
              rejectMutation.mutate({ id: selected.id, note: reason || 'belirtilmedi' })
            })
            setSelectedId(null)
          }}
        />
      )}
    </PageShell>
  )
}

interface DrawerProps {
  item: KycReviewItem
  onClose: () => void
  onApprove: () => void
  onReject: (reason: string) => void
}

function KycDrawer({ item, onClose, onApprove, onReject }: DrawerProps) {
  const [reason, setReason] = useState('')
  const TypeIcon = item.kind === 'office' ? Building2 : User

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
        data-testid="kyc-drawer"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
              <TypeIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {item.id}
              </div>
              <h2 className="mt-0.5 font-serif text-lg font-medium tracking-tight">
                {item.subjectName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-foreground/5"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          <dl className="grid grid-cols-2 gap-3 text-[12px]">
            <Field label="Tip" value={item.kind === 'office' ? 'Kurumsal' : 'Bireysel'} />
            <Field label="Subject ID" value={item.subjectId} />
            <Field label="Tenant" value={item.tenantId ?? '—'} />
            <Field label="Belge sayısı" value={String(item.documentCount)} />
            <Field
              label="Gönderim"
              value={new Date(item.submittedAt).toLocaleString('tr-TR')}
            />
            <Field label="Durum" value={item.status} />
            {item.resolvedAt && (
              <Field
                label="Karar"
                value={new Date(item.resolvedAt).toLocaleString('tr-TR')}
              />
            )}
            {item.resolvedBy && <Field label="Karar veren" value={item.resolvedBy} />}
          </dl>

          <section>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Belgeler (önizleme)
            </div>
            <ul className="mt-2 space-y-1.5">
              {Array.from({ length: item.documentCount }, (_, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[12px]"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono tabular-nums">document-{i + 1}.pdf</span>
                  <span className="ml-auto rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] text-muted-foreground">
                    mock
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {item.status === 'pending' && (
            <div>
              <label
                htmlFor="kyc-reject-reason"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                Reddetme sebebi (opsiyonel)
              </label>
              <textarea
                id="kyc-reject-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                placeholder="örn: Vergi levhası okunamıyor"
              />
            </div>
          )}
        </div>

        {item.status === 'pending' && (
          <footer className="flex items-center gap-2 border-t border-border p-4">
            <button
              type="button"
              onClick={() => onReject(reason)}
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
        )}
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
      <dd className="mt-0.5 break-words text-foreground">{value}</dd>
    </div>
  )
}
