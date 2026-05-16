import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Plus } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  getInstalledPlugins,
  getMarketplacePlugins,
  installPlugin,
  uninstallPlugin,
  updatePluginConfig,
  setPluginStatus,
  subscribePlugins,
  type Plugin,
  type PluginStatus,
} from '@/lib/platform-plugins'
import { PluginGrid } from '@/components/plugins/PluginGrid'
import { PluginDetailDrawer } from '@/components/plugins/PluginDetailDrawer'
import { PluginMarketplaceDialog } from '@/components/plugins/PluginMarketplaceDialog'
import { UninstallPluginDialog } from '@/components/plugins/UninstallPluginDialog'

type FilterKey = 'all' | 'active' | 'disabled' | 'error'

const FILTER_LABEL: Record<FilterKey, string> = {
  all: 'Hepsi',
  active: 'Aktif',
  disabled: 'Devre dışı',
  error: 'Hata',
}

function useInstalledPlugins(): Plugin[] {
  return useSyncExternalStore(
    subscribePlugins,
    () => getInstalledPlugins(),
    () => getInstalledPlugins(),
  )
}

function useMarketplace(): Plugin[] {
  return useSyncExternalStore(
    subscribePlugins,
    () => getMarketplacePlugins(),
    () => getMarketplacePlugins(),
  )
}

export function Plugins() {
  const installed = useInstalledPlugins()
  const marketplace = useMarketplace()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selected, setSelected] = useState<Plugin | null>(null)
  const [marketplaceOpen, setMarketplaceOpen] = useState(false)
  const [confirmUninstall, setConfirmUninstall] = useState<Plugin | null>(null)

  // Keep selected drawer in sync with updates (e.g. config save).
  useEffect(() => {
    if (!selected) return
    const refreshed = installed.find((p) => p.id === selected.id)
    if (!refreshed) setSelected(null)
    else if (refreshed !== selected) setSelected(refreshed)
  }, [installed, selected])

  const filtered = useMemo(() => {
    if (filter === 'all') return installed
    return installed.filter((p) => p.status === (filter as PluginStatus))
  }, [installed, filter])

  const counts = {
    all: installed.length,
    active: installed.filter((p) => p.status === 'active').length,
    disabled: installed.filter((p) => p.status === 'disabled').length,
    error: installed.filter((p) => p.status === 'error').length,
  }

  const handleUninstall = (plugin: Plugin) => setConfirmUninstall(plugin)
  const handleToggleStatus = (plugin: Plugin) => {
    if (plugin.status === 'active') setPluginStatus(plugin.id, 'disabled')
    else if (plugin.status === 'disabled') setPluginStatus(plugin.id, 'active')
  }

  return (
    <PageShell
      eyebrow="MOD · K01 · PLUGIN REGISTRY"
      title={
        <>
          Platform <em className="font-serif italic font-light">eklentileri</em>
        </>
      }
      description={`${counts.all} eklenti yüklü · ${counts.active} aktif · ${counts.disabled} devre dışı · ${counts.error} hata.`}
      actions={
        <button
          type="button"
          onClick={() => setMarketplaceOpen(true)}
          data-testid="open-marketplace"
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Eklenti ekle
        </button>
      }
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Toplam" value={String(counts.all)} hint="yüklü" />
        <Stat label="Aktif" value={String(counts.active)} hint="çalışıyor" />
        <Stat label="Devre dışı" value={String(counts.disabled)} hint="kapalı" />
        <Stat label="Hata" value={String(counts.error)} hint="müdahale gerekli" />
      </section>

      <section className="mb-5 -mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {(['all', 'active', 'disabled', 'error'] as const).map((k) => {
            const active = filter === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                data-testid={`filter-${k}`}
                className={cn(
                  'inline-flex flex-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                  active ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {FILTER_LABEL[k]}
                <span className={cn('rounded-full px-1.5 font-mono text-[10px] tabular-nums', active ? 'bg-background/20' : 'bg-foreground/[0.06]')}>
                  {counts[k]}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <PluginGrid
        plugins={filtered}
        onOpen={setSelected}
        onUninstall={handleUninstall}
        onToggleStatus={handleToggleStatus}
      />

      {selected && (
        <PluginDetailDrawer
          plugin={selected}
          onClose={() => setSelected(null)}
          onSaveConfig={(config) => {
            updatePluginConfig(selected.id, config)
          }}
        />
      )}

      {marketplaceOpen && (
        <PluginMarketplaceDialog
          marketplace={marketplace}
          onClose={() => setMarketplaceOpen(false)}
          onInstall={(p) => {
            installPlugin(p.id)
            setMarketplaceOpen(false)
          }}
        />
      )}

      {confirmUninstall && (
        <UninstallPluginDialog
          plugin={confirmUninstall}
          onClose={() => setConfirmUninstall(null)}
          onConfirm={() => {
            uninstallPlugin(confirmUninstall.id)
            if (selected?.id === confirmUninstall.id) setSelected(null)
            setConfirmUninstall(null)
          }}
        />
      )}
    </PageShell>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}
