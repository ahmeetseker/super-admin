// Wave F26.A — Feature flags table with search + tag filter + env filter.
// Inline rollout slider + enabled toggle + actions (delete). All mutations
// go through @/lib/feature-flags so the localStorage backing stays single-source.

import { useMemo, useState } from 'react'
import { Search, Trash2 } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  deleteFeatureFlag,
  toggleFeatureFlag,
  updateFeatureFlag,
  type FeatureFlag,
  type FlagEnvironment,
} from '@/lib/feature-flags'
import { RolloutSlider } from './RolloutSlider'

interface Props {
  flags: FeatureFlag[]
  onChange: () => void
}

const ENV_LABEL: Record<FlagEnvironment, string> = {
  development: 'Geliştirme',
  preview: 'Önizleme',
  production: 'Canlı',
}

const ENV_DOT: Record<FlagEnvironment, string> = {
  development: 'bg-stone-500',
  preview: 'bg-amber-500',
  production: 'bg-emerald-500',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}g önce`
  const mo = Math.floor(day / 30)
  return `${mo}ay önce`
}

export function FeatureFlagsTable({ flags, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [envFilter, setEnvFilter] = useState<FlagEnvironment | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    flags.forEach((f) => f.tags.forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [flags])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return flags.filter((f) => {
      if (q) {
        const hay = `${f.key} ${f.name} ${f.description ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (envFilter !== 'all' && !f.environments.includes(envFilter)) return false
      if (tagFilter && !f.tags.includes(tagFilter)) return false
      return true
    })
  }, [flags, query, envFilter, tagFilter])

  const handleToggle = (id: string) => {
    toggleFeatureFlag(id)
    onChange()
  }

  const handleRollout = (id: string, value: number) => {
    updateFeatureFlag(id, { rolloutPct: value })
    onChange()
  }

  const handleDelete = (flag: FeatureFlag) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        `"${flag.name}" silinsin mi? Bu işlem geri alınamaz.`,
      )
      if (!ok) return
    }
    deleteFeatureFlag(flag.id)
    onChange()
  }

  return (
    <section data-testid="feature-flags-section">
      <div
        className="mb-3 flex flex-wrap items-center gap-2"
        data-testid="feature-flags-filters"
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Anahtar, ad veya açıklama ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="feature-flags-search"
            aria-label="Feature flag ara"
            className="w-full rounded-xl border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none transition focus:border-foreground"
          />
        </div>

        <div className="flex flex-wrap gap-1" data-testid="env-filter">
          {(['all', 'development', 'preview', 'production'] as const).map((env) => (
            <button
              key={env}
              type="button"
              onClick={() => setEnvFilter(env)}
              data-testid={`env-filter-${env}`}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition',
                envFilter === env
                  ? 'border-foreground/40 bg-foreground/[0.06] text-foreground'
                  : 'border-border bg-background/40 text-muted-foreground hover:bg-foreground/[0.02]',
              )}
            >
              {env === 'all' ? 'Tüm ortamlar' : ENV_LABEL[env]}
            </button>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1" data-testid="tag-filter">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Etiketler
          </span>
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
              tagFilter === null
                ? 'border-foreground/40 bg-foreground/[0.06] text-foreground'
                : 'border-border bg-background/40 text-muted-foreground hover:bg-foreground/[0.02]',
            )}
          >
            tümü
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              data-testid={`tag-filter-${tag}`}
              onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
              className={cn(
                'rounded-full border px-2 py-0.5 font-mono text-[10.5px] transition',
                tagFilter === tag
                  ? 'border-foreground/40 bg-foreground/[0.06] text-foreground'
                  : 'border-border bg-background/40 text-muted-foreground hover:bg-foreground/[0.02]',
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center"
            data-testid="feature-flags-empty"
          >
            <p className="text-[13px] font-medium">Eşleşen flag yok</p>
            <p className="text-[11.5px] text-muted-foreground">
              Filtreleri sıfırlayın veya yeni bir feature flag oluşturun.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-left text-[13px]"
              data-testid="feature-flags-table"
            >
              <thead className="border-b border-border bg-background/30">
                <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-3 py-2.5">Key / Ad</th>
                  <th className="px-3 py-2.5">Etiketler</th>
                  <th className="px-3 py-2.5">Ortamlar</th>
                  <th className="px-3 py-2.5">Rollout</th>
                  <th className="px-3 py-2.5 text-right">Durum</th>
                  <th className="px-3 py-2.5 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((f) => (
                  <tr
                    key={f.id}
                    data-testid="feature-flag-row"
                    data-flag-id={f.id}
                    data-flag-key={f.key}
                    className="transition hover:bg-foreground/[0.02]"
                  >
                    <td className="px-3 py-3 align-top">
                      <div className="font-mono text-[11.5px] text-foreground/90">{f.key}</div>
                      <div className="text-[12px] font-medium">{f.name}</div>
                      {f.description && (
                        <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {f.description}
                        </div>
                      )}
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        düzenlendi {relativeTime(f.modifiedISO)}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {f.tags.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        ) : (
                          f.tags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center rounded-full bg-foreground/[0.06] px-2 py-0.5 font-mono text-[10px] text-foreground/75"
                            >
                              {t}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {f.environments.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground">yok</span>
                        ) : (
                          f.environments.map((env) => (
                            <span
                              key={env}
                              className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10.5px] text-foreground/75"
                            >
                              <span
                                className={cn('h-1.5 w-1.5 rounded-full', ENV_DOT[env])}
                              />
                              {ENV_LABEL[env]}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <RolloutSlider
                        value={f.rolloutPct}
                        onChange={(next) => handleRollout(f.id, next)}
                        ariaLabel={`${f.key} rollout yüzdesi`}
                        testId={`rollout-slider-${f.id}`}
                      />
                    </td>
                    <td className="px-3 py-3 text-right align-top">
                      <button
                        type="button"
                        onClick={() => handleToggle(f.id)}
                        role="switch"
                        aria-checked={f.enabled}
                        aria-label={`${f.key} ${f.enabled ? 'kapat' : 'aç'}`}
                        data-testid={`toggle-${f.id}`}
                        className={cn(
                          'relative inline-flex h-5 w-9 flex-none items-center rounded-full border transition',
                          f.enabled
                            ? 'border-emerald-500/30 bg-emerald-500/30'
                            : 'border-border bg-foreground/[0.06]',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow transition',
                            f.enabled ? 'translate-x-[18px]' : 'translate-x-[2px]',
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right align-top">
                      <button
                        type="button"
                        onClick={() => handleDelete(f)}
                        aria-label={`${f.key} sil`}
                        data-testid={`delete-${f.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/[0.04] px-2 py-1 text-[11.5px] font-medium text-rose-700 transition hover:bg-rose-500/[0.08] dark:text-rose-300"
                      >
                        <Trash2 className="h-3 w-3" /> Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default FeatureFlagsTable
