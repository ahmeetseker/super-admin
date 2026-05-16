// Wave F26.C — Variant editor.
//
// Manages an in-memory list of variants whose `weight` fields must sum to
// exactly 100. The component is fully controlled (parent owns the array)
// so it can be reused inside both the "create" modal and a future inline
// edit flow.

import type { Variant } from '@/lib/ab-experiments'

export type DraftVariant = Pick<Variant, 'key' | 'name' | 'weight'>

interface VariantEditorProps {
  variants: DraftVariant[]
  onChange: (next: DraftVariant[]) => void
  /** Read-only display mode — used inside the detail panel. */
  readOnly?: boolean
}

export function totalWeight(variants: readonly DraftVariant[]): number {
  return variants.reduce((s, v) => s + (Number.isFinite(v.weight) ? v.weight : 0), 0)
}

export function VariantEditor({ variants, onChange, readOnly = false }: VariantEditorProps) {
  const sum = totalWeight(variants)
  const valid = sum === 100

  const update = (index: number, patch: Partial<DraftVariant>) => {
    onChange(
      variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    )
  }

  const addVariant = () => {
    onChange([...variants, { key: `v${variants.length + 1}`, name: '', weight: 0 }])
  }

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index))
  }

  return (
    <div data-testid="variant-editor" className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h4 className="font-serif text-sm tracking-tight">Varyantlar</h4>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Ağırlık toplamı 100 olmalı
          </p>
        </div>
        <div
          data-testid="variant-weight-sum"
          data-valid={valid}
          className={
            'rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ' +
            (valid
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300')
          }
        >
          Toplam: {sum}
        </div>
      </div>

      <ul className="flex flex-col gap-1.5" role="list">
        {variants.map((v, i) => (
          <li
            key={i}
            data-testid={`variant-row-${i}`}
            className="grid grid-cols-[1fr_2fr_5rem_2rem] items-center gap-2 rounded-xl border border-border bg-background p-2"
          >
            <input
              type="text"
              value={v.key}
              readOnly={readOnly}
              onChange={(e) => update(i, { key: e.target.value })}
              placeholder="key"
              aria-label={`Varyant ${i + 1} anahtarı`}
              data-testid={`variant-key-${i}`}
              className="rounded-lg border border-border bg-card px-2 py-1 font-mono text-[12px]"
            />
            <input
              type="text"
              value={v.name}
              readOnly={readOnly}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="görünür ad"
              aria-label={`Varyant ${i + 1} adı`}
              data-testid={`variant-name-${i}`}
              className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={v.weight}
              readOnly={readOnly}
              onChange={(e) => update(i, { weight: Number(e.target.value) })}
              aria-label={`Varyant ${i + 1} ağırlığı`}
              data-testid={`variant-weight-${i}`}
              className="rounded-lg border border-border bg-card px-2 py-1 text-right font-mono text-[12px] tabular-nums"
            />
            {!readOnly && (
              <button
                type="button"
                aria-label={`Varyant ${i + 1} sil`}
                data-testid={`variant-remove-${i}`}
                onClick={() => removeVariant(i)}
                disabled={variants.length <= 2}
                className="rounded-lg border border-border bg-card px-1.5 py-1 text-[10px] text-muted-foreground transition hover:text-foreground disabled:opacity-30"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      {!readOnly && (
        <button
          type="button"
          data-testid="variant-add"
          onClick={addVariant}
          className="self-start rounded-xl border border-dashed border-border bg-card px-3 py-1 text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
        >
          + Yeni varyant
        </button>
      )}
    </div>
  )
}

export default VariantEditor
