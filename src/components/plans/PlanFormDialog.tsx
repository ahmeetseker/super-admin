import { useEffect, useState } from 'react'
import { Plus, X } from '@landx/icons'
import { cn } from '@landx/ui'
import type { PlatformPlan, PlanTier } from '@/lib/platform-plans'
import { createPlan, updatePlan } from '@/lib/platform-plans'

const TIER_OPTIONS: { value: PlanTier; label: string }[] = [
  { value: 'free', label: 'Ücretsiz' },
  { value: 'pro', label: 'Pro' },
  { value: 'premium', label: 'Premium' },
  { value: 'custom', label: 'Kurumsal' },
]

interface FormState {
  name: string
  tier: PlanTier
  priceMonthly: string
  features: string[]
  listings: string
  users: string
  storageGb: string
  isActive: boolean
}

function planToForm(plan: PlatformPlan): FormState {
  return {
    name: plan.name,
    tier: plan.tier,
    priceMonthly: String(plan.priceMonthly),
    features: plan.features.length > 0 ? [...plan.features] : [''],
    listings: String(plan.limits.listings),
    users: String(plan.limits.users),
    storageGb: String(plan.limits.storageGb),
    isActive: plan.isActive,
  }
}

function emptyForm(): FormState {
  return {
    name: '',
    tier: 'pro',
    priceMonthly: '0',
    features: [''],
    listings: '0',
    users: '0',
    storageGb: '0',
    isActive: true,
  }
}

interface Props {
  /** null = create mode; plan = edit mode; undefined = closed */
  plan: PlatformPlan | null | undefined
  onClose: () => void
  onSaved: (plan: PlatformPlan) => void
}

export function PlanFormDialog({ plan, onClose, onSaved }: Props) {
  const isOpen = plan !== undefined
  const isEdit = !!plan
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setForm(plan ? planToForm(plan) : emptyForm())
    setError(null)
  }, [plan, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateFeature = (idx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === idx ? value : f)),
    }))
  }

  const addFeature = () => {
    setForm((prev) => ({ ...prev, features: [...prev.features, ''] }))
  }

  const removeFeature = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.length > 1 ? prev.features.filter((_, i) => i !== idx) : [''],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setError('Plan adı zorunlu.')
      return
    }
    const priceMonthly = Number(form.priceMonthly)
    if (!Number.isFinite(priceMonthly) || priceMonthly < 0) {
      setError('Fiyat 0 veya pozitif sayı olmalı.')
      return
    }
    const listings = Number(form.listings)
    const users = Number(form.users)
    const storageGb = Number(form.storageGb)
    for (const [label, n] of [
      ['İlan limiti', listings],
      ['Kullanıcı limiti', users],
      ['Depolama', storageGb],
    ] as const) {
      if (!Number.isFinite(n)) {
        setError(`${label} sayı olmalı (sınırsız için -1).`)
        return
      }
    }

    const features = form.features.map((f) => f.trim()).filter((f) => f.length > 0)
    const input = {
      name: trimmedName,
      tier: form.tier,
      priceMonthly,
      features,
      limits: { listings, users, storageGb },
      isActive: form.isActive,
    }

    const saved = isEdit && plan
      ? updatePlan(plan.id, input)
      : createPlan(input)

    if (!saved) {
      setError('Plan kaydedilemedi.')
      return
    }
    onSaved(saved)
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label={isEdit ? 'Planı düzenle' : 'Yeni plan oluştur'}
        className="fixed inset-y-0 right-0 z-50 flex w-[min(560px,calc(100vw-2rem))] flex-col border-l border-border bg-card shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              PLAN · {isEdit ? 'DÜZENLE' : 'YENİ'}
            </div>
            <h2 className="mt-1 font-serif text-lg font-medium leading-tight">
              {isEdit ? plan!.name : 'Yeni plan oluştur'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Formu kapat"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 px-5 py-4">
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Plan adı
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Örn. Pro"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Katman
                </label>
                <select
                  value={form.tier}
                  onChange={(e) => setField('tier', e.target.value as PlanTier)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                >
                  {TIER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Aylık fiyat (₺)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.priceMonthly}
                  onChange={(e) => setField('priceMonthly', e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:border-foreground"
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Özellikler
                </label>
                <button
                  type="button"
                  onClick={addFeature}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Ekle
                </button>
              </div>
              <div className="space-y-1.5">
                {form.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={feat}
                      onChange={(e) => updateFeature(i, e.target.value)}
                      placeholder={`Özellik ${i + 1}`}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(i)}
                      aria-label="Özelliği kaldır"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <fieldset className="rounded-xl border border-border bg-background/60 p-3">
              <legend className="px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Limitler (sınırsız için -1)
              </legend>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">İlan</label>
                  <input
                    type="number"
                    step={1}
                    value={form.listings}
                    onChange={(e) => setField('listings', e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm tabular-nums outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">Kullanıcı</label>
                  <input
                    type="number"
                    step={1}
                    value={form.users}
                    onChange={(e) => setField('users', e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm tabular-nums outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">Depolama (GB)</label>
                  <input
                    type="number"
                    step={1}
                    value={form.storageGb}
                    onChange={(e) => setField('storageGb', e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm tabular-nums outline-none focus:border-foreground"
                  />
                </div>
              </div>
            </fieldset>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField('isActive', e.target.checked)}
                className="h-4 w-4"
              />
              <span>Plan aktif (yeni ofisler abone olabilir)</span>
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-300"
              >
                {error}
              </div>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className={cn(
                'inline-flex items-center rounded-xl bg-foreground px-4 py-1.5 text-sm font-medium text-background transition hover:opacity-90',
              )}
            >
              {isEdit ? 'Kaydet' : 'Plan oluştur'}
            </button>
          </footer>
        </form>
      </div>
    </>
  )
}
