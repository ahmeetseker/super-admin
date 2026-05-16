// Wave F26.C — "Create experiment" dialog.
//
// Thin wrapper around `createExperiment(...)` that owns local form state +
// validation hints. Submission failures (duplicate key / bad weight) are
// surfaced inline; on success the modal closes and notifies the parent.

import { useState } from 'react'
import { Dialog } from '@landx/ui'
import { createExperiment, type Experiment } from '@/lib/ab-experiments'
import { VariantEditor, totalWeight, type DraftVariant } from './VariantEditor'

interface CreateExperimentModalProps {
  open: boolean
  onClose: () => void
  onCreated: (exp: Experiment) => void
}

const INITIAL_VARIANTS: DraftVariant[] = [
  { key: 'control', name: 'Kontrol', weight: 50 },
  { key: 'variant', name: 'Varyant', weight: 50 },
]

export function CreateExperimentModal({
  open,
  onClose,
  onCreated,
}: CreateExperimentModalProps) {
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [variants, setVariants] = useState<DraftVariant[]>(INITIAL_VARIANTS)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setKey('')
    setName('')
    setDescription('')
    setVariants(INITIAL_VARIANTS)
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const weightSum = totalWeight(variants)
  const canSubmit =
    key.trim().length > 0 &&
    name.trim().length > 0 &&
    variants.length >= 2 &&
    weightSum === 100 &&
    variants.every((v) => v.key.trim() && v.name.trim())

  const handleSubmit = () => {
    setError(null)
    try {
      const created = createExperiment({
        key: key.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        variants: variants.map((v) => ({
          key: v.key.trim(),
          name: v.name.trim(),
          weight: v.weight,
        })),
      })
      onCreated(created)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="lg"
      title="Yeni A/B deneyi"
      description="Anahtar (key), görünür ad ve en az iki varyant tanımla. Ağırlık toplamı 100 olmalı."
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid="create-experiment-cancel"
            onClick={handleClose}
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
          >
            Vazgeç
          </button>
          <button
            type="button"
            data-testid="create-experiment-submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-foreground px-3 py-1.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
          >
            Oluştur
          </button>
        </div>
      }
    >
      <div data-testid="create-experiment-form" className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Anahtar (key)
          </span>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="home-hero-cta"
            data-testid="create-experiment-key"
            className="rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Görünür ad
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hero CTA renk testi"
            data-testid="create-experiment-name"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Açıklama (opsiyonel)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Hipotez veya bağlam notu"
            data-testid="create-experiment-description"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <VariantEditor variants={variants} onChange={setVariants} />

        {error && (
          <div
            role="alert"
            data-testid="create-experiment-error"
            className="rounded-xl border border-rose-500/30 bg-rose-500/[0.05] px-3 py-2 text-[12.5px] text-rose-700 dark:text-rose-300"
          >
            {error}
          </div>
        )}
      </div>
    </Dialog>
  )
}

export default CreateExperimentModal
