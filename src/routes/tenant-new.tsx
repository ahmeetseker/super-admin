import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight, Check } from '@landx/icons'
import { cn, PageShell, formatTL } from '@landx/ui'
import { PLANS, type PlatformPlan } from '@landx/data'

import { WizardShell, type WizardStep } from '@/components/tenant-wizard/WizardShell'

const STEPS: ReadonlyArray<WizardStep> = [
  { key: 'kimlik', label: 'Kimlik' },
  { key: 'plan', label: 'Plan' },
  { key: 'admin', label: 'Admin' },
  { key: 'moduller', label: 'Modüller' },
  { key: 'onay', label: 'Onay' },
]

// Module catalogue — fallback list; mirrors core LandX modules.
const MODULES: ReadonlyArray<{ id: string; label: string; required?: boolean }> = [
  { id: 'listings', label: 'İlanlar', required: true },
  { id: 'customers', label: 'Müşteriler', required: true },
  { id: 'deals', label: 'Satışlar' },
  { id: 'calendar', label: 'Takvim' },
  { id: 'reports', label: 'Raporlar' },
  { id: 'finance', label: 'Finans' },
  { id: 'messages', label: 'Mesajlar' },
  { id: 'search', label: 'Arama' },
]

interface FormState {
  name: string
  domain: string
  region: string
  planId: PlatformPlan['id']
  adminEmail: string
  adminName: string
  sendInvite: boolean
  modules: Record<string, boolean>
}

const initialModules = (): Record<string, boolean> =>
  Object.fromEntries(MODULES.map((m) => [m.id, !!m.required]))

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function slugify(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function TenantNew() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>({
    name: '',
    domain: '',
    region: 'TR',
    planId: 'pro',
    adminEmail: '',
    adminName: '',
    sendInvite: true,
    modules: initialModules(),
  })
  const [submitting, setSubmitting] = useState(false)

  const selectedPlan = useMemo(() => PLANS.find((p) => p.id === form.planId) ?? PLANS[0], [form.planId])
  const moduleCount = useMemo(
    () => Object.values(form.modules).filter(Boolean).length,
    [form.modules],
  )

  // Per-step validity
  const stepValid = (i: number): boolean => {
    if (i === 0) return form.name.trim().length >= 2 && SLUG_RE.test(form.domain)
    if (i === 1) return !!form.planId
    if (i === 2) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)
    if (i === 3) return moduleCount >= 1
    return true
  }

  const canAdvance = stepValid(step)

  const advance = () => {
    if (!canAdvance) return
    if (step === STEPS.length - 1) {
      submit()
      return
    }
    startTransition(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)))
  }

  const back = () => startTransition(() => setStep((s) => Math.max(s - 1, 0)))

  const submit = () => {
    setSubmitting(true)
    // Mock mutation — generate slug-based id; in real backend, server allocates.
    const newId = form.domain || slugify(form.name)
    setTimeout(() => {
      navigate(`/tenants/${newId}`, {
        state: { justCreated: true, name: form.name },
      })
    }, 350)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    advance()
  }

  return (
    <PageShell
      eyebrow="MOD · TENANT · YENİ"
      title={
        <>
          Yeni <em className="font-serif italic font-light">tenant</em>
        </>
      }
      description="5 adımda bir emlak ofisini platforma alın. Tüm değerler mock — gerçek mutation Faz 12.4'te."
      actions={
        <Link
          to="/tenants"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Listeye dön
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <WizardShell
          steps={STEPS}
          currentIndex={step}
          onStepClick={(i) => startTransition(() => setStep(i))}
          footer={
            <>
              {step > 0 && (
                <button
                  type="button"
                  onClick={back}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5 disabled:opacity-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Geri
                </button>
              )}
              <button
                type="submit"
                disabled={!canAdvance || submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {step === STEPS.length - 1 ? (
                  submitting ? (
                    'Oluşturuluyor…'
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Tenant oluştur
                    </>
                  )
                ) : (
                  <>
                    Devam <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </>
          }
        >
          <header className="mb-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              ADIM {step + 1} / {STEPS.length}
            </div>
            <h2 className="font-serif text-xl font-medium">{STEPS[step].label}</h2>
          </header>

          {step === 0 && (
            <fieldset className="space-y-4">
              <Field label="Ofis adı" hint="Örn: Atölye Emlak Ayvalık">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setForm((f) => ({ ...f, name, domain: f.domain || slugify(name) }))
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </Field>
              <Field
                label="Subdomain"
                hint={`https://${form.domain || 'ornek'}.arsam.net — kebab-case (a-z 0-9 -).`}
              >
                <input
                  type="text"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={form.domain}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, domain: e.target.value.toLowerCase() }))
                  }
                  className={cn(
                    'w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none',
                    form.domain && !SLUG_RE.test(form.domain)
                      ? 'border-rose-500/60 focus:border-rose-500'
                      : 'border-border focus:border-foreground',
                  )}
                />
              </Field>
              <Field label="Bölge">
                <select
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                >
                  <option value="TR">Türkiye (TR-c1)</option>
                </select>
              </Field>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset className="grid gap-3 md:grid-cols-3">
              {PLANS.map((p) => {
                const sel = p.id === form.planId
                return (
                  <label
                    key={p.id}
                    className={cn(
                      'cursor-pointer rounded-2xl border p-4 transition',
                      sel
                        ? 'border-foreground bg-foreground/[0.04]'
                        : 'border-border bg-background hover:border-foreground/40',
                    )}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={p.id}
                      checked={sel}
                      onChange={() => setForm((f) => ({ ...f, planId: p.id }))}
                      className="sr-only"
                    />
                    <div className="flex items-baseline justify-between">
                      <div className="font-serif text-lg font-medium">{p.name}</div>
                      {sel && <Check className="h-3.5 w-3.5 text-foreground" aria-hidden />}
                    </div>
                    <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {p.monthlyPriceTL > 0 ? `${formatTL(p.monthlyPriceTL)} / ay` : 'Ücretsiz'}
                    </div>
                    <ul className="mt-3 space-y-1 text-[12.5px] text-muted-foreground">
                      <li>
                        <span className="text-foreground">İlan:</span>{' '}
                        {p.limits.listings === 'unlimited' ? 'Sınırsız' : p.limits.listings}
                      </li>
                      <li>
                        <span className="text-foreground">Kullanıcı:</span>{' '}
                        {p.limits.users === 'unlimited' ? 'Sınırsız' : p.limits.users}
                      </li>
                      <li>
                        <span className="text-foreground">Depolama:</span> {p.limits.storage_gb} GB
                      </li>
                    </ul>
                  </label>
                )
              })}
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="space-y-4">
              <Field label="Admin e-posta" hint="İlk admin kullanıcı; davet bu adrese gider.">
                <input
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </Field>
              <Field label="Tam ad" hint="Opsiyonel.">
                <input
                  type="text"
                  value={form.adminName}
                  onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.sendInvite}
                  onChange={(e) => setForm((f) => ({ ...f, sendInvite: e.target.checked }))}
                  className="h-3.5 w-3.5 accent-foreground"
                />
                Davet e-postası gönder (mock)
              </label>
            </fieldset>
          )}

          {step === 3 && (
            <fieldset>
              <p className="mb-3 text-[12.5px] text-muted-foreground">
                Bu tenant'a açılacak modülleri seç. <span className="text-foreground">İlanlar</span>{' '}
                ve <span className="text-foreground">Müşteriler</span> zorunlu.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {MODULES.map((m) => {
                  const checked = !!form.modules[m.id]
                  return (
                    <label
                      key={m.id}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition',
                        checked
                          ? 'border-foreground/40 bg-foreground/[0.04]'
                          : 'border-border bg-background hover:border-foreground/30',
                        m.required && 'opacity-90',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={m.required}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            modules: { ...f.modules, [m.id]: e.target.checked },
                          }))
                        }
                        className="h-3.5 w-3.5 accent-foreground"
                      />
                      <span className="font-medium">{m.label}</span>
                      {m.required && (
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          ZORUNLU
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}

          {step === 4 && (
            <div className="space-y-3 text-[13.5px]">
              <SumRow label="Ofis" value={form.name} />
              <SumRow label="Subdomain" value={`${form.domain}.arsam.net`} mono />
              <SumRow label="Bölge" value={form.region} />
              <SumRow
                label="Plan"
                value={`${selectedPlan.name} · ${selectedPlan.monthlyPriceTL > 0 ? `${formatTL(selectedPlan.monthlyPriceTL)} / ay` : 'Ücretsiz'}`}
              />
              <SumRow label="Admin" value={`${form.adminName || '—'} <${form.adminEmail}>`} />
              <SumRow
                label="Modüller"
                value={`${moduleCount} adet (${Object.entries(form.modules)
                  .filter(([, v]) => v)
                  .map(([k]) => MODULES.find((m) => m.id === k)?.label)
                  .join(', ')})`}
              />
              <SumRow
                label="Davet"
                value={form.sendInvite ? 'E-posta gönderilecek' : 'Gönderilmeyecek'}
              />
              <p className="pt-2 text-[11.5px] text-muted-foreground">
                "Tenant oluştur" tıklandığında mock backend oluşturulur ve detay sayfasına
                yönlendirileceksin.
              </p>
            </div>
          )}
        </WizardShell>
      </form>
    </PageShell>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      {children}
      {hint && <div className="mt-1 text-[11.5px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function SumRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className={cn(mono && 'font-mono', 'text-foreground tabular-nums')}>{value}</dd>
    </div>
  )
}

export default TenantNew
