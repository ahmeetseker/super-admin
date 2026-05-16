// Wave F26.A — Create feature flag modal.
// key + name + description + tags + environments + initial rolloutPct.
// Hits createFeatureFlag in @/lib/feature-flags (localStorage-backed).

import { useEffect, useMemo, useState } from 'react'
import { X } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  createFeatureFlag,
  type FeatureFlag,
  type FlagEnvironment,
} from '@/lib/feature-flags'
import { RolloutSlider } from './RolloutSlider'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (flag: FeatureFlag) => void
}

const ENVS: { value: FlagEnvironment; label: string }[] = [
  { value: 'development', label: 'Geliştirme' },
  { value: 'preview', label: 'Önizleme' },
  { value: 'production', label: 'Canlı' },
]

const KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,49}$/

export function CreateFlagModal({ open, onClose, onCreated }: Props) {
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [environments, setEnvironments] = useState<FlagEnvironment[]>(['development'])
  const [rolloutPct, setRolloutPct] = useState(0)
  const [touched, setTouched] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setKey('')
    setName('')
    setDescription('')
    setTagsRaw('')
    setEnvironments(['development'])
    setRolloutPct(0)
    setTouched(false)
    setSubmitError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const keyValid = useMemo(() => KEY_PATTERN.test(key), [key])
  const nameValid = name.trim().length >= 2
  const canSubmit = keyValid && nameValid

  if (!open) return null

  const toggleEnv = (env: FlagEnvironment) => {
    setEnvironments((prev) =>
      prev.includes(env) ? prev.filter((e) => e !== env) : [...prev, env],
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    setSubmitError(null)
    if (!canSubmit) return
    try {
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const created = createFeatureFlag({
        key: key.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        tags,
        environments,
        rolloutPct,
      })
      onCreated(created)
      onClose()
    } catch (err) {
      setSubmitError((err as Error).message || 'Oluşturulamadı')
    }
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
        aria-modal="true"
        aria-label="Yeni feature flag oluştur"
        data-testid="create-flag-modal"
        className="fixed left-1/2 top-1/2 z-50 flex w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              FEATURE FLAG · YENİ
            </div>
            <h2 className="mt-1 font-serif text-xl font-medium leading-tight">
              Yeni feature flag
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Anahtar bir kez yazılır; sonradan değiştirilemez. Önce kapalı olarak oluşturulur.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Key */}
          <div>
            <label
              htmlFor="flag-key"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Anahtar (key)
            </label>
            <input
              id="flag-key"
              data-testid="flag-key-input"
              type="text"
              required
              autoFocus
              placeholder="örn. new-search-widget"
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase())}
              onBlur={() => setTouched(true)}
              className={cn(
                'w-full rounded-xl border bg-background px-3 py-2 font-mono text-sm outline-none transition focus:border-foreground',
                touched && !keyValid && key.length > 0 ? 'border-rose-500/60' : 'border-border',
              )}
            />
            {touched && key.length > 0 && !keyValid && (
              <p className="mt-1 text-[11.5px] text-rose-600 dark:text-rose-400">
                küçük harf, rakam ve tire; 2–50 karakter.
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="flag-name"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Ad
            </label>
            <input
              id="flag-name"
              data-testid="flag-name-input"
              type="text"
              required
              placeholder="Yeni arama widgetı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="flag-description"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Açıklama (opsiyonel)
            </label>
            <textarea
              id="flag-description"
              rows={2}
              placeholder="Bu bayrağın amacı, kim için açılıyor, hangi koşulda kapatılır."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="flag-tags"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Etiketler (virgülle ayır)
            </label>
            <input
              id="flag-tags"
              data-testid="flag-tags-input"
              type="text"
              placeholder="ui, listing, backend-bound"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </div>

          {/* Environments */}
          <fieldset>
            <legend className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Ortamlar
            </legend>
            <div className="flex flex-wrap gap-1.5" data-testid="flag-env-grid">
              {ENVS.map((env) => {
                const active = environments.includes(env.value)
                return (
                  <button
                    key={env.value}
                    type="button"
                    data-testid={`flag-env-${env.value}`}
                    onClick={() => toggleEnv(env.value)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition',
                      active
                        ? 'border-foreground/40 bg-foreground/[0.06] text-foreground'
                        : 'border-border bg-background/40 text-muted-foreground hover:bg-foreground/[0.02]',
                    )}
                  >
                    {env.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* Rollout */}
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              İlk rollout yüzdesi
            </label>
            <RolloutSlider
              value={rolloutPct}
              onChange={setRolloutPct}
              testId="create-flag-rollout"
              size="md"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Oluşturulduğunda flag varsayılan olarak <strong>kapalı</strong> gelir; aç düğmesini
              tabloda kullanın.
            </p>
          </div>

          {submitError && (
            <div
              data-testid="create-flag-error"
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2 text-[12px] text-rose-700 dark:text-rose-300"
            >
              {submitError}
            </div>
          )}
        </form>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-foreground/[0.04]"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="create-flag-submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Oluştur
          </button>
        </footer>
      </div>
    </>
  )
}

export default CreateFlagModal
