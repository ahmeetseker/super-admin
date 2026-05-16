import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Cable, Sparkles, ShieldCheck, Settings, Star, X, Search, ShieldAlert, Check } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  CATEGORY_LABEL,
  labelPermission,
  type Plugin,
  type PluginCategory,
} from '@/lib/platform-plugins'

const CATEGORY_ICON: Record<PluginCategory, React.ComponentType<{ className?: string }>> = {
  analytics: BarChart3,
  integration: Cable,
  crm: Sparkles,
  security: ShieldCheck,
  utility: Settings,
}

const CATEGORIES: (PluginCategory | 'all')[] = ['all', 'analytics', 'integration', 'crm', 'security', 'utility']

export interface PluginMarketplaceDialogProps {
  marketplace: Plugin[]
  onInstall: (plugin: Plugin) => void
  onClose: () => void
}

export function PluginMarketplaceDialog({ marketplace, onInstall, onClose }: PluginMarketplaceDialogProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<PluginCategory | 'all'>('all')
  const [confirmPlugin, setConfirmPlugin] = useState<Plugin | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmPlugin) setConfirmPlugin(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, confirmPlugin])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    return marketplace.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (!q) return true
      return p.name.toLocaleLowerCase('tr').includes(q) || p.publisher.toLocaleLowerCase('tr').includes(q)
    })
  }, [marketplace, category, query])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Eklenti pazaryeri"
      data-testid="plugin-marketplace-dialog"
    >
      <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 -z-10" />
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-serif text-2xl font-light tracking-tight">Eklenti pazaryeri</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {marketplace.length} eklenti mevcut · arama ve kategoriyle filtreleyin
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 border-b border-border bg-background/40 px-5 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Eklenti ara…"
              aria-label="Eklenti ara"
              data-testid="marketplace-search"
              className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none transition focus:border-foreground/40"
            />
          </div>
          <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
              {CATEGORIES.map((c) => {
                const active = category === c
                const count =
                  c === 'all'
                    ? marketplace.length
                    : marketplace.filter((p) => p.category === c).length
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    data-testid={`marketplace-cat-${c}`}
                    className={cn(
                      'inline-flex flex-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                      active ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {c === 'all' ? 'Hepsi' : CATEGORY_LABEL[c]}
                    <span className={cn('rounded-full px-1.5 font-mono text-[10px] tabular-nums', active ? 'bg-background/20' : 'bg-foreground/[0.06]')}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const Icon = CATEGORY_ICON[p.category]
              return (
                <article
                  key={p.id}
                  className="flex flex-col rounded-2xl border border-border bg-background/40 p-4"
                  data-testid={`marketplace-card-${p.id}`}
                >
                  <header className="mb-3 flex items-start justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/[0.06]">
                      <Icon className="h-4 w-4 text-foreground/80" />
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{p.rating.toFixed(1)}</span>
                    </div>
                  </header>
                  <div className="mb-1 flex items-baseline gap-2">
                    <h3 className="font-serif text-base font-light tracking-tight">{p.name}</h3>
                    <span className="font-mono text-[10px] text-muted-foreground">v{p.version}</span>
                  </div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {p.publisher} · {CATEGORY_LABEL[p.category]}
                  </div>
                  <p className="mb-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">{p.description}</p>
                  <button
                    type="button"
                    onClick={() => setConfirmPlugin(p)}
                    data-testid={`install-${p.id}`}
                    className="mt-auto inline-flex items-center justify-center rounded-xl bg-foreground px-3 py-1.5 text-[13px] font-medium text-background transition hover:opacity-90"
                  >
                    Yükle
                  </button>
                </article>
              )
            })}
            {filtered.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Bu kriterlere uygun eklenti bulunamadı.
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmPlugin && (
        <InstallConfirmDialog
          plugin={confirmPlugin}
          onClose={() => setConfirmPlugin(null)}
          onConfirm={() => {
            const p = confirmPlugin
            setConfirmPlugin(null)
            onInstall(p)
          }}
        />
      )}
    </div>
  )
}

function InstallConfirmDialog({
  plugin,
  onConfirm,
  onClose,
}: {
  plugin: Plugin
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${plugin.name} izin onayı`}
      data-testid="install-confirm-dialog"
    >
      <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 -z-10" />
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-amber-500/10">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            </span>
            <div>
              <h3 className="font-serif text-xl font-light tracking-tight">İzinleri onayla</h3>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {plugin.name} · v{plugin.version}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Bu eklenti yüklendiğinde aşağıdaki izinlere sahip olacaktır:
          </p>
          <ul className="space-y-2" data-testid="install-permissions-list">
            {plugin.permissions.map((perm) => (
              <li key={perm} className="flex items-start gap-2 rounded-xl border border-border bg-background/40 p-3">
                <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="text-[13px] font-medium">{labelPermission(perm)}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{perm}</div>
                </div>
              </li>
            ))}
            {plugin.permissions.length === 0 && (
              <li className="rounded-xl border border-dashed border-border p-3 text-[13px] text-muted-foreground">
                Bu eklenti ek izin istemez.
              </li>
            )}
          </ul>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-background/40 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-foreground/5"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="install-confirm-accept"
            className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
          >
            Kabul ediyorum, yükle
          </button>
        </footer>
      </div>
    </div>
  )
}
