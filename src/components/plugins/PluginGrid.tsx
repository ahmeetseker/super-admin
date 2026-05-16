import { Plug } from '@landx/icons'
import { PluginCard } from './PluginCard'
import type { Plugin } from '@/lib/platform-plugins'

export interface PluginGridProps {
  plugins: Plugin[]
  onOpen: (plugin: Plugin) => void
  onUninstall: (plugin: Plugin) => void
  onToggleStatus?: (plugin: Plugin) => void
}

export function PluginGrid({ plugins, onOpen, onUninstall, onToggleStatus }: PluginGridProps) {
  if (plugins.length === 0) {
    return (
      <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        <Plug className="mx-auto mb-2 h-5 w-5" />
        Bu kategoride eklenti yok.
      </div>
    )
  }
  return (
    <section
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="plugin-grid"
    >
      {plugins.map((p) => (
        <PluginCard
          key={p.id}
          plugin={p}
          onOpen={onOpen}
          onUninstall={onUninstall}
          onToggleStatus={onToggleStatus}
        />
      ))}
    </section>
  )
}
