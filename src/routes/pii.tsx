/**
 * PII Governance route — F36.E (Wave F36 / Faz 2).
 *
 * 2 sekme:
 *   - Inventory: 30 PII alanı (table.column × sensitivity × encrypted/masked
 *     × retention), her satırda "Remediate" butonu → modal (mask/encrypt/
 *     delete/pseudonymize).
 *   - DSAR Queue: 8 başvuru (type × subject × status × affectedTables),
 *     pending olanlar için Onayla/Reddet aksiyonları.
 *
 * Faz 1 hooks: `usePiiInventory`, `useRemediatePii`, `usePiiDsarQueue`,
 * `useFulfillDsar`.
 *
 * Tasarım:
 *   - PageShell, eyebrow "MOD · D02 · PII"
 *   - Üstte 5 stat (toplam alan, encrypted%, sensitive_pii, special_category,
 *     DSAR pending)
 *   - Sekme: Inventory / DSAR (useTransition)
 *   - Filter bar: sensitivity + table (inventory)
 *   - Remediation modal: action selector + apply
 */

import { useDeferredValue, useMemo, useState, useTransition } from 'react'
import {
  Database,
  EyeOff,
  FileText,
  Lock,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
} from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  useFulfillDsar,
  usePiiDsarQueue,
  usePiiInventory,
  useRemediatePii,
  type PiiDsarRequest,
  type PiiDsarStatus,
  type PiiDsarType,
  type PiiInventoryItem,
  type PiiRemediationAction,
  type PiiSensitivity,
} from '@landx/data'

type Tab = 'inventory' | 'dsar'
type SensitivityFilter = 'all' | PiiSensitivity

const SENSITIVITY_TONE: Record<PiiSensitivity, string> = {
  public: 'bg-foreground/[0.06] text-muted-foreground',
  internal: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  pii: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  sensitive_pii: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  special_category: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
}

const SENSITIVITY_LABEL: Record<PiiSensitivity, string> = {
  public: 'Açık',
  internal: 'İç',
  pii: 'PII',
  sensitive_pii: 'Hassas PII',
  special_category: 'Özel nitelikli',
}

const REMEDIATION_LABEL: Record<PiiRemediationAction, string> = {
  mask: 'Logda maskele',
  encrypt: 'Şifrele (at-rest)',
  delete: 'Hemen sil (retention=0)',
  pseudonymize: 'Pseudonymize et',
}

const REMEDIATION_ICON: Record<PiiRemediationAction, React.ComponentType<{ className?: string }>> = {
  mask: EyeOff,
  encrypt: Lock,
  delete: Trash2,
  pseudonymize: ShieldCheck,
}

const DSAR_STATUS_TONE: Record<PiiDsarStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  processing: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  fulfilled: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  rejected: 'bg-stone-500/10 text-stone-600 dark:text-stone-400',
}

const DSAR_STATUS_LABEL: Record<PiiDsarStatus, string> = {
  pending: 'Bekliyor',
  processing: 'İşleniyor',
  fulfilled: 'Tamamlandı',
  rejected: 'Reddedildi',
}

const DSAR_TYPE_LABEL: Record<PiiDsarType, string> = {
  access: 'Erişim',
  erasure: 'Silme',
  rectification: 'Düzeltme',
  portability: 'Taşınabilirlik',
}

function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

export function Pii() {
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>('inventory')
  const [sensitivity, setSensitivity] = useState<SensitivityFilter>('all')
  const [tableFilter, setTableFilter] = useState<string>('all')
  const [remediateItemId, setRemediateItemId] = useState<string | null>(null)

  const deferredTab = useDeferredValue(tab)
  const deferredSensitivity = useDeferredValue(sensitivity)
  const deferredTable = useDeferredValue(tableFilter)

  const inventoryQuery = usePiiInventory()
  const dsarQuery = usePiiDsarQueue()
  const remediate = useRemediatePii()
  const fulfill = useFulfillDsar()

  const inventory = inventoryQuery.data ?? []
  const dsar = dsarQuery.data ?? []

  // Üst stats — hem sekme bağımsız hep gözüksün.
  const total = inventory.length
  const encrypted = inventory.filter((i) => i.encrypted).length
  const sensitivePii = inventory.filter((i) => i.sensitivity === 'sensitive_pii').length
  const specialCategory = inventory.filter((i) => i.sensitivity === 'special_category').length
  const dsarPending = dsar.filter((d) => d.status === 'pending').length

  // Mevcut tablolar — dropdown için.
  const tables = useMemo(() => {
    const set = new Set(inventory.map((i) => i.table))
    return Array.from(set).sort()
  }, [inventory])

  const filteredInventory = useMemo(() => {
    return inventory.filter((i) => {
      if (deferredSensitivity !== 'all' && i.sensitivity !== deferredSensitivity) return false
      if (deferredTable !== 'all' && i.table !== deferredTable) return false
      return true
    })
  }, [inventory, deferredSensitivity, deferredTable])

  const remediateItem = remediateItemId
    ? inventory.find((i) => i.id === remediateItemId) ?? null
    : null

  return (
    <PageShell
      eyebrow="MOD · D02 · PII"
      title={
        <>
          PII <em className="font-serif italic font-light">yönetimi</em>
        </>
      }
      description={`${total} alan envanteri · ${encrypted} şifreli · ${dsarPending} DSAR bekliyor. KVKK 7/12, GDPR Art. 17.`}
    >
      {/* Üst stats */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Toplam alan" value={String(total)} hint={`${tables.length} tabloda`} />
        <Stat
          label="Şifreli"
          value={`${total > 0 ? Math.round((encrypted / total) * 100) : 0}%`}
          hint={`${encrypted}/${total}`}
        />
        <Stat label="Hassas PII" value={String(sensitivePii)} hint="ek korunma" />
        <Stat
          label="Özel nitelikli"
          value={String(specialCategory)}
          hint="KVKK m.6"
        />
        <Stat label="DSAR bekliyor" value={String(dsarPending)} hint="aksiyon gerekli" />
      </section>

      {/* Uyarı şeridi */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-none text-amber-700 dark:text-amber-300" />
        <div className="text-[13px] leading-relaxed text-amber-900 dark:text-amber-200">
          <strong className="font-medium">PII envanteri tek doğruluk kaynağıdır.</strong>{' '}
          Sensitivity, encrypted, retention değişiklikleri audit edilir. DSAR
          başvuruları KVKK 13. madde uyarınca 30 gün içinde sonuçlanır.
        </div>
      </div>

      {/* Sekme barı */}
      <div className="mb-6 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
        <TabButton
          active={tab === 'inventory'}
          onClick={() => startTransition(() => setTab('inventory'))}
          icon={Database}
          label="Envanter"
          count={inventory.length}
        />
        <TabButton
          active={tab === 'dsar'}
          onClick={() => startTransition(() => setTab('dsar'))}
          icon={FileText}
          label="DSAR Kuyruğu"
          count={dsar.length}
          badge={dsarPending > 0 ? dsarPending : undefined}
        />
      </div>

      {/* Inventory tab */}
      {deferredTab === 'inventory' && (
        <>
          <section className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={tableFilter}
              onChange={(e) => startTransition(() => setTableFilter(e.target.value))}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground"
              aria-label="Tablo filtresi"
            >
              <option value="all">Tüm tablolar ({inventory.length})</option>
              {tables.map((t) => {
                const count = inventory.filter((i) => i.table === t).length
                return (
                  <option key={t} value={t}>
                    {t} ({count})
                  </option>
                )
              })}
            </select>

            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
              {(['all', 'public', 'internal', 'pii', 'sensitive_pii', 'special_category'] as const).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => startTransition(() => setSensitivity(s))}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium transition',
                      sensitivity === s
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {s === 'all' ? 'Hepsi' : SENSITIVITY_LABEL[s]}
                  </button>
                ),
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            {inventoryQuery.isLoading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
                Envanter yükleniyor…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="px-4 py-2.5">Alan</th>
                      <th className="px-4 py-2.5">Tip</th>
                      <th className="px-4 py-2.5">Sensitivity</th>
                      <th className="px-4 py-2.5 text-center">Şifreli</th>
                      <th className="px-4 py-2.5 text-center">Maskelendi</th>
                      <th className="px-4 py-2.5">Retention</th>
                      <th className="px-4 py-2.5">Son erişim</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/60 transition hover:bg-foreground/[0.02] last:border-0"
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="font-mono text-[12px] font-medium">
                            {item.table}.{item.column}
                          </div>
                          {item.legalBasis && (
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              {item.legalBasis}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10px]">
                            {item.dataType}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                              SENSITIVITY_TONE[item.sensitivity],
                            )}
                          >
                            {SENSITIVITY_LABEL[item.sensitivity]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          {item.encrypted ? (
                            <Lock className="mx-auto h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                          ) : (
                            <ShieldOff className="mx-auto h-3.5 w-3.5 text-rose-700 dark:text-rose-300" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          {item.maskedInLogs ? (
                            <EyeOff className="mx-auto h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={cn(
                              'font-mono text-[11px]',
                              item.retentionDays === 0
                                ? 'text-rose-700 dark:text-rose-300'
                                : 'text-muted-foreground',
                            )}
                          >
                            {item.retentionDays === 0 ? 'silindi' : `${item.retentionDays}g`}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-[12px]">{relativeTime(item.lastAccessedAt)}</div>
                          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {item.accessCount30d}× son 30g
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <button
                            type="button"
                            onClick={() => setRemediateItemId(item.id)}
                            className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium transition hover:bg-foreground/5"
                          >
                            Remediate
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredInventory.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          <Lock className="mx-auto mb-2 h-4 w-4" />
                          Filtreye uygun alan yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* DSAR tab */}
      {deferredTab === 'dsar' && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          {dsarQuery.isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
              DSAR kuyruğu yükleniyor…
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {dsar.map((d) => (
                <DsarRow
                  key={d.id}
                  dsar={d}
                  onFulfill={(outcome) =>
                    fulfill.mutate({ dsarId: d.id, outcome })
                  }
                  pending={fulfill.isPending && fulfill.variables?.dsarId === d.id}
                />
              ))}
              {dsar.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-4 w-4" />
                  DSAR başvurusu yok.
                </li>
              )}
            </ul>
          )}
        </section>
      )}

      {/* Remediation modal */}
      {remediateItem && (
        <RemediateModal
          item={remediateItem}
          onClose={() => setRemediateItemId(null)}
          onApply={(action) =>
            remediate.mutate(
              { itemId: remediateItem.id, action },
              { onSuccess: () => setRemediateItemId(null) },
            )
          }
          pending={remediate.isPending}
        />
      )}
    </PageShell>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
        active
          ? 'bg-foreground text-background shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 font-mono text-[10px]',
          active ? 'bg-background/20' : 'bg-foreground/[0.06]',
        )}
      >
        {count}
      </span>
      {badge !== undefined && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[10px] font-medium text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}

function DsarRow({
  dsar,
  onFulfill,
  pending,
}: {
  dsar: PiiDsarRequest
  onFulfill: (outcome: 'approve' | 'reject') => void
  pending: boolean
}) {
  const canAct = dsar.status === 'pending' || dsar.status === 'processing'
  return (
    <li className="p-4 transition hover:bg-foreground/[0.02]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {dsar.id}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                DSAR_STATUS_TONE[dsar.status],
              )}
            >
              {DSAR_STATUS_LABEL[dsar.status]}
            </span>
            <span className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10px]">
              {DSAR_TYPE_LABEL[dsar.type]}
            </span>
          </header>
          <h3 className="mt-1 font-serif text-lg font-light tracking-tight">
            {dsar.subjectName}
          </h3>
          <div className="mt-1 text-[12px] text-muted-foreground">
            Başvuru: {dateShort(dsar.requestedAt)}
            {dsar.fulfilledAt && (
              <>
                {' '}
                · Sonuç: {dateShort(dsar.fulfilledAt)}
              </>
            )}
          </div>
          {dsar.affectedTables.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {dsar.affectedTables.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10px]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        {canAct && (
          <div className="flex flex-none items-center gap-2">
            <button
              type="button"
              onClick={() => onFulfill('reject')}
              disabled={pending}
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-[12px] font-medium transition hover:bg-foreground/5 disabled:opacity-50"
            >
              Reddet
            </button>
            <button
              type="button"
              onClick={() => onFulfill('approve')}
              disabled={pending}
              className="rounded-xl bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? '…' : 'Onayla'}
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

function RemediateModal({
  item,
  onClose,
  onApply,
  pending,
}: {
  item: PiiInventoryItem
  onClose: () => void
  onApply: (action: PiiRemediationAction) => void
  pending: boolean
}) {
  const [action, setAction] = useState<PiiRemediationAction>('mask')

  // Hangi aksiyonlar mantıklı? Zaten encrypted ise "encrypt" disable; zaten
  // masked ise "mask" disable. Kullanıcı yanlış aksiyon uygulamasın diye.
  const disabledMap: Record<PiiRemediationAction, boolean> = {
    mask: item.maskedInLogs,
    encrypt: item.encrypted,
    delete: item.retentionDays === 0,
    pseudonymize: item.encrypted && item.maskedInLogs,
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pii-remediate-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Remediation
            </div>
            <h2
              id="pii-remediate-title"
              className="mt-1 font-serif text-xl font-light tracking-tight"
            >
              {item.table}.{item.column}
            </h2>
            <div className="mt-1 text-[12px] text-muted-foreground">
              {SENSITIVITY_LABEL[item.sensitivity]} · {item.dataType}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-full p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mb-4 space-y-1 rounded-xl border border-border bg-card p-3 text-[12px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Şu an şifreli</span>
            <span>{item.encrypted ? 'Evet' : 'Hayır'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Logda maskelenmiş</span>
            <span>{item.maskedInLogs ? 'Evet' : 'Hayır'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Retention</span>
            <span className="font-mono">
              {item.retentionDays === 0 ? 'silindi' : `${item.retentionDays}g`}
            </span>
          </div>
        </div>

        <fieldset className="mb-4">
          <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Aksiyon
          </legend>
          <div className="space-y-1">
            {(['mask', 'encrypt', 'delete', 'pseudonymize'] as const).map((a) => {
              const Icon = REMEDIATION_ICON[a]
              const isDisabled = disabledMap[a]
              return (
                <label
                  key={a}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-[13px] transition hover:bg-foreground/5',
                    action === a && 'border-foreground/30 ring-2 ring-foreground/10',
                    isDisabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <input
                    type="radio"
                    name="remediation"
                    value={a}
                    checked={action === a}
                    onChange={() => setAction(a)}
                    disabled={isDisabled}
                    className="sr-only"
                  />
                  <Icon className="h-4 w-4 flex-none text-muted-foreground" />
                  <span className="flex-1">{REMEDIATION_LABEL[a]}</span>
                  {isDisabled && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      uygulandı
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => onApply(action)}
            disabled={pending || disabledMap[action]}
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Uygulanıyor…' : 'Uygula'}
          </button>
        </div>
      </div>
    </div>
  )
}
