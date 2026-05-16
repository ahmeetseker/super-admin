/**
 * Compliance route — F36.E (Wave F36 / Faz 2).
 *
 * 5 framework posture (KVKK · VERBİS · GDPR · SOC2 · ISO27001) + 53 control
 * tablosu. Faz 1 `useComplianceControls`, `useCompliancePosture`,
 * `useUpdateControlEvidence` hook'larını tüketir.
 *
 * Tasarım:
 *   - PageShell, eyebrow "MOD · D03 · COMPLIANCE"
 *   - Üstte 5 posture card (scorePct donut + compliant/partial/missing)
 *   - Filter bar: framework chip'leri + status filter
 *   - Control listesi (tablo): controlNo, name, framework, status, lastReviewed, owner, evidence count
 *   - Click → detail drawer (description + evidence list + "kanıt ekle")
 *   - useTransition: framework + status filter setter
 */

import { useDeferredValue, useMemo, useState, useTransition } from 'react'
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ShieldAlert,
  ShieldOff,
  Slash,
  X,
} from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  useComplianceControls,
  useCompliancePosture,
  useUpdateControlEvidence,
  type LandxComplianceControl,
  type LandxComplianceEvidence,
  type LandxComplianceEvidenceType,
  type LandxComplianceFramework,
  type LandxComplianceStatus,
} from '@landx/data'

const FRAMEWORKS: LandxComplianceFramework[] = [
  'KVKK',
  'VERBİS',
  'GDPR',
  'SOC2',
  'ISO27001',
]

const FRAMEWORK_REGION: Record<LandxComplianceFramework, 'TR' | 'EU' | 'Global'> = {
  KVKK: 'TR',
  VERBİS: 'TR',
  GDPR: 'EU',
  SOC2: 'Global',
  ISO27001: 'Global',
}

const REGION_TONE: Record<'TR' | 'EU' | 'Global', string> = {
  TR: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  EU: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  Global: 'bg-foreground/[0.06] text-foreground/70',
}

const STATUS_TONE: Record<LandxComplianceStatus, { ring: string; text: string; bg: string }> = {
  compliant: { ring: 'border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-500/10' },
  partial: { ring: 'border-amber-500/30', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-500/10' },
  missing: { ring: 'border-rose-500/30', text: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-500/10' },
  not_applicable: { ring: 'border-stone-500/20', text: 'text-stone-600 dark:text-stone-400', bg: 'bg-stone-500/10' },
}

const STATUS_LABEL: Record<LandxComplianceStatus, string> = {
  compliant: 'Uyumlu',
  partial: 'Kısmi',
  missing: 'Eksik',
  not_applicable: 'Uygulanamaz',
}

const STATUS_ICON: Record<LandxComplianceStatus, React.ComponentType<{ className?: string }>> = {
  compliant: CheckCircle2,
  partial: CircleDashed,
  missing: ShieldOff,
  not_applicable: Slash,
}

const EVIDENCE_TYPE_LABEL: Record<LandxComplianceEvidenceType, string> = {
  document: 'Belge',
  config: 'Konfig',
  audit: 'Denetim',
  attestation: 'Beyan',
}

type StatusFilter = 'all' | LandxComplianceStatus

function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function daysUntil(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

function PostureDonut({ score, color }: { score: number; color: string }) {
  const r = 28
  const c = 2 * Math.PI * r
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden>
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        className="text-foreground/[0.08]"
      />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(c * score) / 100} ${c}`}
        transform="rotate(-90 40 40)"
      />
      <text
        x="40"
        y="44"
        textAnchor="middle"
        className="fill-foreground font-serif text-[16px]"
        fontWeight="300"
      >
        {score}%
      </text>
    </svg>
  )
}

export function Compliance() {
  const [, startTransition] = useTransition()
  const [frameworkFilter, setFrameworkFilter] = useState<'all' | LandxComplianceFramework>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [drawerId, setDrawerId] = useState<string | null>(null)

  // Filter changes go through useTransition so the table re-render stays
  // non-blocking (React 19 pattern — concurrent rendering on filter change).
  const deferredFramework = useDeferredValue(frameworkFilter)
  const deferredStatus = useDeferredValue(statusFilter)

  const controlsQuery = useComplianceControls(
    deferredFramework === 'all' ? undefined : { framework: deferredFramework },
  )
  const postureQuery = useCompliancePosture()
  const updateEvidence = useUpdateControlEvidence()

  const controls = controlsQuery.data ?? []
  const posture = postureQuery.data ?? []

  const filtered = useMemo(() => {
    if (deferredStatus === 'all') return controls
    return controls.filter((c) => c.status === deferredStatus)
  }, [controls, deferredStatus])

  const drawerControl = drawerId
    ? controls.find((c) => c.id === drawerId) ?? null
    : null

  // Aggregate sayaçlar (üst stats).
  const totalControls = posture.reduce((s, p) => s + p.totalControls, 0)
  const totalCompliant = posture.reduce((s, p) => s + p.compliantCount, 0)
  const totalPartial = posture.reduce((s, p) => s + p.partialCount, 0)
  const totalMissing = posture.reduce((s, p) => s + p.missingCount, 0)
  const avgScore =
    posture.length > 0
      ? Math.round(posture.reduce((s, p) => s + p.scorePct, 0) / posture.length)
      : 0

  return (
    <PageShell
      eyebrow="MOD · D03 · COMPLIANCE"
      title={
        <>
          Uyum <em className="font-serif italic font-light">postürü</em>
        </>
      }
      description={`${posture.length} aktif çerçeve · ${totalCompliant}/${totalControls} kontrol uyumlu · ortalama skor %${avgScore}.`}
    >
      {/* Üst stats */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Toplam kontrol" value={String(totalControls)} hint={`${posture.length} çerçevede`} />
        <Stat
          label="Uyumlu"
          value={String(totalCompliant)}
          hint={totalControls > 0 ? `%${Math.round((totalCompliant / totalControls) * 100)}` : '—'}
        />
        <Stat label="Kısmi" value={String(totalPartial)} hint="iyileştirme planı" />
        <Stat label="Eksik" value={String(totalMissing)} hint="aksiyon gerekli" />
      </section>

      {/* Posture cards (5 framework) */}
      <section
        data-posture-grid=""
        className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5"
      >
        {FRAMEWORKS.map((fw) => {
          const p = posture.find((x) => x.framework === fw)
          const isActive = frameworkFilter === fw
          const score = p?.scorePct ?? 0
          const color = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#e11d48'
          const region = FRAMEWORK_REGION[fw]
          return (
            <button
              key={fw}
              type="button"
              onClick={() =>
                startTransition(() => setFrameworkFilter(isActive ? 'all' : fw))
              }
              aria-pressed={isActive}
              className={cn(
                'flex items-start gap-3 rounded-2xl border bg-card p-4 text-left transition',
                isActive
                  ? 'border-foreground/30 ring-2 ring-foreground/10'
                  : 'border-border hover:border-foreground/20',
              )}
            >
              <PostureDonut score={score} color={color} />
              <div className="min-w-0 flex-1">
                <header className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <h3 className="font-serif text-base font-light tracking-tight">{fw}</h3>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[10px]',
                      REGION_TONE[region],
                    )}
                  >
                    {region}
                  </span>
                </header>
                {p ? (
                  <dl className="space-y-0.5 text-[12px]">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Uyumlu</dt>
                      <dd className="tabular-nums text-emerald-700 dark:text-emerald-300">
                        {p.compliantCount}/{p.totalControls}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Kısmi</dt>
                      <dd className="tabular-nums text-amber-700 dark:text-amber-300">
                        {p.partialCount}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Eksik</dt>
                      <dd className="tabular-nums text-rose-700 dark:text-rose-300">
                        {p.missingCount}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-[12px] text-muted-foreground">Veri yok.</p>
                )}
              </div>
            </button>
          )
        })}
      </section>

      {/* Filter bar */}
      <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <FilterChip
              active={frameworkFilter === 'all'}
              onClick={() => startTransition(() => setFrameworkFilter('all'))}
              label="Hepsi"
              count={controls.length}
            />
            {FRAMEWORKS.map((fw) => {
              const subset = controls.filter((c) => c.framework === fw)
              return (
                <FilterChip
                  key={fw}
                  active={frameworkFilter === fw}
                  onClick={() => startTransition(() => setFrameworkFilter(fw))}
                  label={fw}
                  count={subset.length}
                  icon={BadgeCheck}
                />
              )
            })}
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {(['all', 'compliant', 'partial', 'missing', 'not_applicable'] as const).map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => startTransition(() => setStatusFilter(s))}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium transition',
                  statusFilter === s
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s === 'all' ? 'Hepsi' : STATUS_LABEL[s]}
              </button>
            ),
          )}
        </div>
      </section>

      {/* Control tablosu */}
      <section
        data-compliance-controls=""
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        {controlsQuery.isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
            Kontroller yükleniyor…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-4 py-2.5">Kontrol</th>
                  <th className="px-4 py-2.5">Ad</th>
                  <th className="px-4 py-2.5">Çerçeve</th>
                  <th className="px-4 py-2.5">Durum</th>
                  <th className="px-4 py-2.5">Son inceleme</th>
                  <th className="px-4 py-2.5">Sahip</th>
                  <th className="px-4 py-2.5">Kanıt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const tone = STATUS_TONE[c.status]
                  const Icon = STATUS_ICON[c.status]
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setDrawerId(c.id)}
                      className="cursor-pointer border-b border-border/60 transition hover:bg-foreground/[0.02] last:border-0"
                    >
                      <td className="px-4 py-3 align-top">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {c.controlNo}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="text-[13px] font-medium">{c.name}</div>
                        <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                          {c.description}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px]',
                            REGION_TONE[FRAMEWORK_REGION[c.framework]],
                          )}
                        >
                          {c.framework}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                            tone.bg,
                            tone.text,
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {STATUS_LABEL[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-[12px] text-muted-foreground">
                        {dateShort(c.lastReviewedAt)}
                        <div className="mt-0.5 font-mono text-[10px]">
                          {daysUntil(c.nextReviewDue) >= 0
                            ? `sonraki ${daysUntil(c.nextReviewDue)}g`
                            : `${Math.abs(daysUntil(c.nextReviewDue))}g gecikmiş`}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-[12px]">{c.owner}</td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center rounded-full px-2 py-0.5 font-mono text-[11px]',
                            c.evidence.length > 0
                              ? 'bg-foreground/10 text-foreground'
                              : 'bg-foreground/[0.04] text-muted-foreground',
                          )}
                        >
                          {c.evidence.length}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      <BadgeCheck className="mx-auto mb-2 h-4 w-4" />
                      Filtreye uygun kontrol yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Detail drawer */}
      {drawerControl && (
        <EvidenceDrawer
          control={drawerControl}
          onClose={() => setDrawerId(null)}
          onSubmit={(input) =>
            updateEvidence.mutate(
              { controlId: drawerControl.id, ...input },
              { onSuccess: () => setDrawerId(null) },
            )
          }
          pending={updateEvidence.isPending}
        />
      )}
    </PageShell>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition',
        active ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 font-mono text-[10px]',
          active ? 'bg-background/20' : 'bg-foreground/[0.06]',
        )}
      >
        {count}
      </span>
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

interface DrawerSubmit {
  evidence: LandxComplianceEvidence
  newStatus?: LandxComplianceStatus
}

function EvidenceDrawer({
  control,
  onClose,
  onSubmit,
  pending,
}: {
  control: LandxComplianceControl
  onClose: () => void
  onSubmit: (input: DrawerSubmit) => void
  pending: boolean
}) {
  const [type, setType] = useState<LandxComplianceEvidenceType>('document')
  const [reference, setReference] = useState('')
  const [markCompliant, setMarkCompliant] = useState(true)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!reference.trim()) return
    onSubmit({
      evidence: { type, reference: reference.trim() },
      newStatus: markCompliant ? 'compliant' : undefined,
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="flex h-full w-full max-w-[480px] flex-col overflow-y-auto border-l border-border bg-background p-6 shadow-2xl">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {control.framework} · {control.controlNo}
            </div>
            <h2
              id="evidence-drawer-title"
              className="mt-1 font-serif text-xl font-light tracking-tight"
            >
              {control.name}
            </h2>
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

        <section className="mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Açıklama
          </div>
          <p className="mt-1 text-[13px] leading-relaxed">{control.description}</p>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-3 text-[12px]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Sahip
            </div>
            <div className="mt-0.5">{control.owner}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Sonraki inceleme
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {dateShort(control.nextReviewDue)}
            </div>
          </div>
        </section>

        <section className="mb-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Mevcut kanıtlar ({control.evidence.length})
          </div>
          {control.evidence.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-[12px] text-muted-foreground">
              <ShieldAlert className="mr-1 inline h-3 w-3" />
              Bu kontrol için kanıt bulunmuyor.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {control.evidence.map((ev, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-[12px]"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{ev.reference}</div>
                    {ev.uploadedAt && (
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {dateShort(ev.uploadedAt)}
                      </div>
                    )}
                  </div>
                  <span className="flex-none rounded-full bg-foreground/[0.06] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {EVIDENCE_TYPE_LABEL[ev.type]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={submit} className="space-y-3 border-t border-border pt-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Kanıt ekle
          </div>
          <div>
            <label htmlFor="ev-type" className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Tür
            </label>
            <select
              id="ev-type"
              value={type}
              onChange={(e) => setType(e.target.value as LandxComplianceEvidenceType)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            >
              {(['document', 'config', 'audit', 'attestation'] as const).map((t) => (
                <option key={t} value={t}>
                  {EVIDENCE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ev-ref" className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Referans (URL / dosya yolu / kayıt id)
            </label>
            <input
              id="ev-ref"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="örn. s3://compliance/kvkk-12-2026.pdf"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={markCompliant}
              onChange={(e) => setMarkCompliant(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Kanıt eklendiğinde durumu <strong className="font-medium">uyumlu</strong> olarak işaretle
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={pending || !reference.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Kaydediliyor…' : 'Ekle'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}
