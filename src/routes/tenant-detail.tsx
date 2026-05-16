import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { start as startImpersonate } from '@/lib/impersonate'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Coins,
  CreditCard,
  ExternalLink,
  Lock,
  MessagesSquare,
  Send,
} from '@landx/icons'
import type { PlanTierId } from '@landx/data'

// Lazy: the plan-change modal pulls PlanComparisonTable + proration helpers
// only when actually opened; protects super-admin main bundle budget (40 KB).
const PlanChangeModal = lazy(() =>
  import('@/components/plan-change/PlanChangeModal').then((m) => ({
    default: m.PlanChangeModal,
  })),
)
// Wave F13.B: webhook + suspend modals are lazy too — UsageReportButton ships
// with the route (CSV gen is tiny), but the modals pull form state + lib
// helpers that would otherwise inflate the main bundle.
const WebhookCreateModal = lazy(() =>
  import('@/components/tenant/WebhookCreateModal').then((m) => ({
    default: m.WebhookCreateModal,
  })),
)
const SuspendModal = lazy(() =>
  import('@/components/tenant/SuspendModal').then((m) => ({
    default: m.SuspendModal,
  })),
)
// Wave F20.A: per-tenant deep-dive panels (Kullanım / Gelir / Sağlık) are
// lazy — they pull SVG charts + analytics imports that don't belong in the
// main super-admin bundle for tenants who only land on the Genel tab.
const TenantUsagePanel = lazy(() =>
  import('@/components/tenant/TenantUsagePanel').then((m) => ({
    default: m.TenantUsagePanel,
  })),
)
const TenantRevenuePanel = lazy(() =>
  import('@/components/tenant/TenantRevenuePanel').then((m) => ({
    default: m.TenantRevenuePanel,
  })),
)
const TenantHealthPanel = lazy(() =>
  import('@/components/tenant/TenantHealthPanel').then((m) => ({
    default: m.TenantHealthPanel,
  })),
)
import { UsageReportButton } from '@/components/tenant/UsageReportButton'
import { cn, EmptyState, ErrorState, formatTL, formatTLCompact, PageShell, timeAgo } from '@landx/ui'
import {
  AUDIT_LOG,
  CONVERSATION_SESSIONS,
  LLM_SPEND_BY_TENANT,
  PII_ACCESS_LOG,
  TENANTS,
  WEBHOOK_DELIVERIES,
  WEBHOOK_ENDPOINTS,
} from '@landx/data'

type TenantTab = 'overview' | 'usage' | 'revenue' | 'health'

const TAB_DEFS: { id: TenantTab; label: string }[] = [
  { id: 'overview', label: 'Genel' },
  { id: 'usage', label: 'Kullanım' },
  { id: 'revenue', label: 'Gelir' },
  { id: 'health', label: 'Sağlık' },
]

function isTab(value: string | null): value is TenantTab {
  return value === 'overview' || value === 'usage' || value === 'revenue' || value === 'health'
}

export function TenantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const tenant = useMemo(() => TENANTS.find((t) => t.id === id), [id])

  const rawTab = searchParams.get('tab')
  const tab: TenantTab = isTab(rawTab) ? rawTab : 'overview'

  function selectTab(next: TenantTab) {
    const params = new URLSearchParams(searchParams)
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const [impersonateConfirm, setImpersonateConfirm] = useState(false)
  const [impersonateReason, setImpersonateReason] = useState('')
  const [planChangeOpen, setPlanChangeOpen] = useState(false)
  // Pending plan change is a UI-only mock (no backend mutation in Faz 11.9).
  const [pendingPlan, setPendingPlan] = useState<PlanTierId | null>(null)
  // Wave F13.B: webhook + suspend modal triggers.
  const [webhookCreateOpen, setWebhookCreateOpen] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspended, setSuspended] = useState(false)

  if (!tenant) {
    return (
      <PageShell
        eyebrow="MOD · TENANT · 404"
        title={
          <>
            Tenant <em className="font-serif italic font-light">bulunamadı</em>
          </>
        }
      >
        <ErrorState
          title={`Tenant ID '${id ?? '—'}' bulunamadı`}
          description="Listeden tenant seçin veya ID'yi kontrol edin."
          onRetry={() => navigate('/tenants')}
        />
      </PageShell>
    )
  }

  // Filter related data
  const auditLog = AUDIT_LOG.filter((e) => e.tenantId === tenant.id).slice(0, 10)
  const webhookEndpoints = WEBHOOK_ENDPOINTS.filter((w) => w.tenantId === tenant.id)
  const webhookDeliveries = WEBHOOK_DELIVERIES.filter((d) => {
    const ep = WEBHOOK_ENDPOINTS.find((e) => e.id === d.webhookId)
    return ep?.tenantId === tenant.id
  }).slice(0, 6)
  const llmSpend = LLM_SPEND_BY_TENANT.filter((r) => r.tenant === tenant.name)
  const llmTotal = llmSpend.reduce((s, r) => s + r.costUSD, 0)
  const piiLog = PII_ACCESS_LOG.filter((p) => p.tenantId === tenant.id).slice(0, 5)
  const sessions = CONVERSATION_SESSIONS.filter((s) => s.tenantId === tenant.id).slice(0, 5)
  const activeSessions = CONVERSATION_SESSIONS.filter(
    (s) => s.tenantId === tenant.id && s.status === 'active',
  ).length

  return (
    <PageShell
      eyebrow={`TENANT · ${tenant.id.toUpperCase()}`}
      title={
        <>
          {tenant.name} <em className="font-serif italic font-light text-muted-foreground">detay</em>
        </>
      }
      description={`${tenant.city} · ${tenant.plan} · ${tenant.status} · ${tenant.userCount} kullanıcı · ${tenant.listingCount} ilan.`}
      actions={
        <>
          <Link
            to="/tenants"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Listeye dön
          </Link>
          <button
            type="button"
            onClick={() => setPlanChangeOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Planı değiştir
          </button>
          <button
            type="button"
            onClick={() => setImpersonateConfirm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Impersonate
          </button>
        </>
      }
    >
      {/* Plan change modal (Faz 11.9 — UI-only, no real mutation) */}
      {planChangeOpen && (
        <Suspense fallback={null}>
          <PlanChangeModal
            currentPlanName={tenant.plan}
            cycleStartISO="2026-05-01T00:00:00Z"
            todayISO={new Date().toISOString()}
            onClose={() => setPlanChangeOpen(false)}
            onConfirm={(newPlan) => {
              setPendingPlan(newPlan)
              setPlanChangeOpen(false)
            }}
          />
        </Suspense>
      )}

      {/* Wave F13.B — webhook create */}
      {webhookCreateOpen && (
        <Suspense fallback={null}>
          <WebhookCreateModal
            tenantId={tenant.id}
            tenantName={tenant.name}
            onClose={() => setWebhookCreateOpen(false)}
          />
        </Suspense>
      )}

      {/* Wave F13.B — suspend (type-to-confirm) */}
      {suspendOpen && (
        <Suspense fallback={null}>
          <SuspendModal
            tenantIds={[tenant.id]}
            tenantLabel={tenant.name}
            onClose={() => setSuspendOpen(false)}
            onSuspended={() => setSuspended(true)}
          />
        </Suspense>
      )}

      {/* Confirmation modal for impersonate (mock) */}
      {impersonateConfirm && (
        <div
          role="dialog"
          aria-label="Impersonate onayı"
          className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-md"
          onClick={() => setImpersonateConfirm(false)}
        >
          <section
            className="w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-3 flex items-start gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300"
              >
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-serif text-lg">Impersonate başlatılacak</h3>
                <p className="text-sm text-muted-foreground">
                  Bu işlem audit log'a kaydedilir ve 4-göz onayı gerekir.{' '}
                  <strong>Neden?</strong> alanı zorunlu.
                </p>
              </div>
            </header>
            <label
              htmlFor="impersonate-reason"
              className="mb-1 mt-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              NEDEN (audit kaydı)
            </label>
            <textarea
              id="impersonate-reason"
              value={impersonateReason}
              onChange={(e) => setImpersonateReason(e.target.value)}
              rows={3}
              required
              minLength={20}
              placeholder="Örn: Müşteri destek talebi #INC-2026-0142, kullanıcı veri düzeltme yetkisi gerekli."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-[hsl(var(--placeholder))] focus:border-foreground"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Min 20 karakter. <strong className="text-foreground">15 dk session</strong> verilir.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setImpersonateConfirm(false)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={impersonateReason.length < 20}
                onClick={() => {
                  startImpersonate({ id: tenant.id, name: tenant.name })
                  setImpersonateConfirm(false)
                  setImpersonateReason('')
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Onayla ve başlat
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Wave F20.A — Tab bar (URL-bound via ?tab=). Kullanım / Gelir / Sağlık
          tabs unlock the deep-dive panels; Genel keeps the F11/F13 KPI + section
          layout untouched. */}
      <nav
        aria-label="Tenant sekmeleri"
        className="-mt-2 mb-6 flex items-center gap-1 overflow-x-auto border-b border-border"
        data-testid="tenant-tab-bar"
      >
        {TAB_DEFS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`tenant-tab-${t.id}`}
              onClick={() => selectTab(t.id)}
              className={cn(
                '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition',
                active
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      {tab === 'usage' && (
        <Suspense fallback={<div data-testid="tenant-tab-loading" className="h-24" />}>
          <TenantUsagePanel tenant={tenant} />
        </Suspense>
      )}
      {tab === 'revenue' && (
        <Suspense fallback={<div data-testid="tenant-tab-loading" className="h-24" />}>
          <TenantRevenuePanel tenant={tenant} />
        </Suspense>
      )}
      {tab === 'health' && (
        <Suspense fallback={<div data-testid="tenant-tab-loading" className="h-24" />}>
          <TenantHealthPanel tenant={tenant} />
        </Suspense>
      )}

      {tab === 'overview' && (
      <>
      {/* KPI row */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={Coins}
          label="Aylık ciro (MRR)"
          value={tenant.mrr > 0 ? formatTLCompact(tenant.mrr) : '—'}
          hint={tenant.plan}
          tone="emerald"
        />
        <Kpi
          icon={Building2}
          label="İlan + Kullanıcı"
          value={`${tenant.listingCount} + ${tenant.userCount}`}
          hint="aktif"
          tone="violet"
        />
        <Kpi
          icon={MessagesSquare}
          label="Aktif AI oturum"
          value={String(activeSessions)}
          hint={`${sessions.length} bu hafta`}
          tone="sky"
        />
        <Kpi
          icon={Coins}
          label="LLM cost (ay)"
          value={`$${llmTotal.toFixed(2)}`}
          hint={`${llmSpend.length} model`}
          tone="amber"
        />
      </section>

      {/* 2-col layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-6">
          {/* Recent audit log */}
          <article className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-3 flex items-baseline justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  SON OLAYLAR
                </div>
                <h3 className="font-serif text-lg font-medium">Audit log</h3>
              </div>
              <Link
                to="/audit"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
              >
                TÜM AUDIT →
              </Link>
            </header>
            {auditLog.length === 0 ? (
              <EmptyState
                title="Bu tenant için olay yok"
                description="Audit kayıtları gelmedi henüz."
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {auditLog.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2.5">
                    <span
                      aria-hidden
                      className={cn(
                        'h-1.5 w-1.5 flex-none rounded-full',
                        e.outcome === 'success' ? 'bg-emerald-500' : 'bg-rose-500',
                      )}
                    />
                    <code className="flex-none font-mono text-[10px] text-muted-foreground">
                      {e.action}
                    </code>
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">{e.actor}</span>
                    <span className="flex-none font-mono text-[10px] tabular-nums text-muted-foreground">
                      {timeAgo(e.atISO)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* Webhook endpoints */}
          <article className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-3 flex items-baseline justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  WEBHOOK'LAR
                </div>
                <h3 className="font-serif text-lg font-medium">
                  {webhookEndpoints.length} endpoint kurulu
                </h3>
              </div>
              <Link
                to="/webhooks"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
              >
                TÜMÜ →
              </Link>
            </header>
            {webhookEndpoints.length === 0 ? (
              <EmptyState title="Webhook yok" description="Bu tenant henüz webhook kurmamış." />
            ) : (
              <ul className="space-y-2">
                {webhookEndpoints.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Send className="h-3.5 w-3.5 text-muted-foreground" />
                        <code className="truncate font-mono text-[11.5px] text-foreground">
                          {w.url}
                        </code>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                        <span
                          className={cn(
                            'rounded-full px-1.5',
                            w.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : w.status === 'failing'
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                : 'bg-stone-500/10 text-stone-600 dark:text-stone-400',
                          )}
                        >
                          {w.status}
                        </span>
                        <span>başarı %{(w.successRate30d * 100).toFixed(1)}</span>
                        <span>·</span>
                        <span>{w.totalDeliveries.toLocaleString('tr-TR')} teslimat</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {webhookDeliveries.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
                  Son {webhookDeliveries.length} teslimat
                </summary>
                <ul className="mt-2 divide-y divide-border/60">
                  {webhookDeliveries.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 py-2 text-[12px]">
                      <span
                        aria-hidden
                        className={cn(
                          'h-1.5 w-1.5 flex-none rounded-full',
                          d.status === 'success'
                            ? 'bg-emerald-500'
                            : d.status === 'failed'
                              ? 'bg-rose-500'
                              : 'bg-amber-500',
                        )}
                      />
                      <code className="flex-none font-mono text-[10px] text-muted-foreground">
                        {d.event}
                      </code>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        HTTP {d.httpStatus ?? '—'} · {d.attempts}x
                      </span>
                      <span className="flex-none font-mono text-[10px] tabular-nums text-muted-foreground">
                        {timeAgo(d.atISO)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </article>

          {/* AI Sessions */}
          <article className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-3 flex items-baseline justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  SON AI OTURUMLARI
                </div>
                <h3 className="font-serif text-lg font-medium">{sessions.length} oturum</h3>
              </div>
              <Link
                to="/sessions"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
              >
                TÜMÜ →
              </Link>
            </header>
            {sessions.length === 0 ? (
              <EmptyState title="AI oturumu yok" />
            ) : (
              <ul className="divide-y divide-border/60">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span
                      aria-hidden
                      className={cn(
                        'h-1.5 w-1.5 flex-none rounded-full',
                        s.status === 'active'
                          ? 'bg-sky-500'
                          : s.status === 'flagged'
                            ? 'bg-rose-500'
                            : 'bg-stone-400',
                      )}
                    />
                    <span className="flex-none text-[12.5px] font-medium">{s.userName}</span>
                    <span className="min-w-0 flex-1 truncate text-[11.5px] italic text-muted-foreground">
                      "{s.firstMessage}"
                    </span>
                    {s.hasPiiFlag && (
                      <Lock className="h-3 w-3 flex-none text-rose-600" aria-label="PII algılandı" />
                    )}
                    <span className="flex-none font-mono text-[10px] tabular-nums text-muted-foreground">
                      ${s.costUSD.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        {/* RIGHT — info card */}
        <aside className="space-y-4">
          <article className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                TENANT BİLGİSİ
              </div>
              <h3 className="font-serif text-lg font-medium">{tenant.name}</h3>
            </header>
            <dl className="space-y-2.5 text-[13px]">
              <Row label="ID" value={tenant.id} mono />
              <Row label="Plan" value={tenant.plan} />
              {pendingPlan && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Bekleyen
                  </dt>
                  <dd className="inline-flex items-center gap-1.5 rounded-full border border-foreground/30 bg-foreground/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground">
                    → {pendingPlan}
                  </dd>
                </div>
              )}
              <Row label="Durum" value={tenant.status} />
              <Row label="Şehir" value={tenant.city} />
              <Row
                label="Oluşturuldu"
                value={new Date(tenant.createdISO).toLocaleDateString('tr-TR')}
              />
              <Row label="Son aktivite" value={timeAgo(tenant.lastActiveISO)} />
              <Row label="MRR" value={tenant.mrr > 0 ? formatTL(tenant.mrr) : '—'} mono />
            </dl>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                PII ERIŞIMI
              </div>
              <h3 className="font-serif text-base font-medium">Son 30 gün</h3>
            </header>
            {piiLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">PII erişimi yok.</p>
            ) : (
              <ul className="space-y-1.5 text-[12.5px]">
                {piiLog.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-2">
                    <span className="truncate">{p.actor}</span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {timeAgo(p.atISO)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/pii"
              className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            >
              DETAYLI PII LOG →
            </Link>
          </article>

          {/* Tenant settings shortcuts */}
          <article className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                HIZLI EYLEMLER
              </div>
            </header>
            <div className="flex flex-col gap-1.5 text-[13px]">
              <button
                type="button"
                onClick={() => setPlanChangeOpen(true)}
                className="text-left text-muted-foreground transition hover:text-foreground"
              >
                ▶ Planı değiştir
              </button>
              <UsageReportButton tenantId={tenant.id} tenantName={tenant.name} />
              <button
                type="button"
                onClick={() => setWebhookCreateOpen(true)}
                data-testid="tenant-webhook-create-trigger"
                className="text-left text-muted-foreground transition hover:text-foreground"
              >
                ▶ Webhook ekle
              </button>
              <button
                type="button"
                onClick={() => setSuspendOpen(true)}
                data-testid="tenant-suspend-trigger"
                className="text-left text-rose-600 transition hover:text-rose-700"
              >
                ▶ {suspended ? 'Askıya alındı — destek ile geri al' : 'Hesabı askıya al (yıkıcı)'}
              </button>
            </div>
          </article>
        </aside>
      </div>
      </>
      )}
    </PageShell>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'slate',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
  tone?: string
}) {
  const tones: Record<string, string> = {
    slate: 'bg-stone-500/10 text-stone-600 dark:text-stone-400',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  }
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div
        className={cn(
          'mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg',
          tones[tone] ?? tones.slate,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className={cn(mono && 'font-mono', 'text-foreground tabular-nums')}>{value}</dd>
    </div>
  )
}
