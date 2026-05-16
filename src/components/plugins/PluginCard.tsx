import { BarChart3, Cable, Sparkles, ShieldCheck, Settings, Star, MoreHorizontal, Trash2, Power, AlertCircle, Loader2 } from '@landx/icons'
import { cn } from '@landx/ui'
import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { CATEGORY_LABEL, STATUS_LABEL, type Plugin, type PluginCategory, type PluginStatus } from '@/lib/platform-plugins'

const CATEGORY_ICON: Record<PluginCategory, React.ComponentType<{ className?: string }>> = {
  analytics: BarChart3,
  integration: Cable,
  crm: Sparkles,
  security: ShieldCheck,
  utility: Settings,
}

const STATUS_TONE: Record<PluginStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  disabled: 'bg-stone-500/10 text-stone-600 dark:text-stone-400',
  error: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  installing: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  updating: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
}

export interface PluginCardProps {
  plugin: Plugin
  onOpen: (plugin: Plugin) => void
  onUninstall: (plugin: Plugin) => void
  onToggleStatus?: (plugin: Plugin) => void
}

export function PluginCard({ plugin, onOpen, onUninstall, onToggleStatus }: PluginCardProps) {
  const Icon = CATEGORY_ICON[plugin.category]
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const isInstalling = plugin.status === 'installing'

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleOpen = () => onOpen(plugin)
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOpen()
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      aria-label={`${plugin.name} detayını aç`}
      data-testid={`plugin-card-${plugin.id}`}
      className="group relative flex cursor-pointer flex-col items-start rounded-2xl border border-border bg-card p-5 text-left transition hover:border-foreground/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-foreground/40"
    >
      <header className="mb-3 flex w-full items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/[0.06]">
          <Icon className="h-4 w-4 text-foreground/80" />
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_TONE[plugin.status])}>
            {plugin.status === 'installing' && <Loader2 className="h-3 w-3 animate-spin" />}
            {plugin.status === 'error' && <AlertCircle className="h-3 w-3" />}
            {STATUS_LABEL[plugin.status]}
          </span>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label={`${plugin.name} menü`}
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              disabled={isInstalling}
              className="rounded-lg p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground disabled:opacity-40"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-7 z-30 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              >
                {onToggleStatus && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onToggleStatus(plugin)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-foreground/5"
                  >
                    <Power className="h-3.5 w-3.5" />
                    {plugin.status === 'disabled' ? 'Etkinleştir' : 'Devre dışı bırak'}
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onUninstall(plugin)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-500/5 dark:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Kaldır
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mb-1 flex items-baseline gap-2">
        <h3 className="font-serif text-lg font-light tracking-tight">{plugin.name}</h3>
        <span className="font-mono text-[10px] text-muted-foreground">v{plugin.version}</span>
      </div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {plugin.publisher} · {CATEGORY_LABEL[plugin.category]}
      </div>
      <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{plugin.description}</p>

      <footer className="mt-auto flex w-full items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {plugin.rating.toFixed(1)} · {plugin.installCount.toLocaleString('tr-TR')}
          </span>
        </div>
      </footer>
    </article>
  )
}
