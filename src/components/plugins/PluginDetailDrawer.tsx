import { useEffect, useState } from 'react'
import { X, Star, BarChart3, Cable, Sparkles, ShieldCheck, Settings, Save } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
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

type TabId = 'general' | 'permissions' | 'config' | 'changelog'

export interface PluginDetailDrawerProps {
  plugin: Plugin
  onClose: () => void
  onSaveConfig?: (config: Record<string, unknown>) => void
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'Genel' },
  { id: 'permissions', label: 'İzinler' },
  { id: 'config', label: 'Yapılandırma' },
  { id: 'changelog', label: 'Changelog' },
]

function formatDate(ts: number | undefined): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function PluginDetailDrawer({ plugin, onClose, onSaveConfig }: PluginDetailDrawerProps) {
  const Icon = CATEGORY_ICON[plugin.category]
  const [tab, setTab] = useState<TabId>('general')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={`${plugin.name} detayı`}
      data-testid="plugin-detail-drawer"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Kapat"
        className="flex-1 bg-foreground/40 backdrop-blur-sm transition"
      />
      <aside className="flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-foreground/[0.06]">
              <Icon className="h-5 w-5 text-foreground/80" />
            </span>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{plugin.id}</div>
              <h2 className="mt-0.5 font-serif text-2xl font-light tracking-tight">{plugin.name}</h2>
              <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                v{plugin.version} · {plugin.publisher}
              </div>
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

        <nav className="border-b border-border bg-background/40 px-3" role="tablist">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                data-testid={`plugin-tab-${t.id}`}
                className={cn(
                  'relative rounded-lg px-3 py-2 text-[13px] font-medium transition',
                  tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" aria-hidden />
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'general' && <GeneralPane plugin={plugin} />}
          {tab === 'permissions' && <PermissionsPane plugin={plugin} />}
          {tab === 'config' && <ConfigPane plugin={plugin} onSaveConfig={onSaveConfig} />}
          {tab === 'changelog' && <ChangelogPane plugin={plugin} />}
        </div>
      </aside>
    </div>
  )
}

function GeneralPane({ plugin }: { plugin: Plugin }) {
  return (
    <>
      <section className="mb-5">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Açıklama</div>
        <p className="text-[13px] leading-relaxed">{plugin.description}</p>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Kategori</div>
          <div className="mt-1 text-[13px]">{CATEGORY_LABEL[plugin.category]}</div>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Durum</div>
          <div className="mt-1 text-[13px]">{STATUS_LABEL[plugin.status]}</div>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Yayıncı</div>
          <div className="mt-1 text-[13px]">{plugin.publisher}</div>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Sürüm</div>
          <div className="mt-1 font-mono text-[13px]">v{plugin.version}</div>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Puan</div>
          <div className="mt-1 flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-serif text-base font-light tabular-nums">{plugin.rating.toFixed(1)}</span>
            <span className="font-mono text-[10px] text-muted-foreground">/ 5</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Yükleme</div>
          <div className="mt-1 font-serif text-base font-light tabular-nums">
            {plugin.installCount.toLocaleString('tr-TR')}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Yüklenme tarihi</div>
        <div className="text-[13px]">{formatDate(plugin.installedAt)}</div>
      </section>
    </>
  )
}

function PermissionsPane({ plugin }: { plugin: Plugin }) {
  if (plugin.permissions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-5 text-center text-[13px] text-muted-foreground">
        Bu eklenti ek izin istemez.
      </div>
    )
  }
  return (
    <ul className="space-y-2" data-testid="plugin-permissions-list">
      {plugin.permissions.map((perm) => (
        <li key={perm} className="rounded-xl border border-border bg-background/40 p-3">
          <div className="text-[13px] font-medium">{labelPermission(perm)}</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{perm}</div>
        </li>
      ))}
    </ul>
  )
}

function ConfigPane({
  plugin,
  onSaveConfig,
}: {
  plugin: Plugin
  onSaveConfig?: (config: Record<string, unknown>) => void
}) {
  const initialEntries = Object.entries(plugin.config ?? {})
  const [rows, setRows] = useState<[string, string][]>(
    initialEntries.length > 0
      ? initialEntries.map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
      : [['', '']],
  )

  const handleUpdate = (idx: number, key: 'k' | 'v', value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? (key === 'k' ? [value, r[1]] : [r[0], value]) : r)))
  }

  const handleSave = () => {
    if (!onSaveConfig) return
    const obj: Record<string, unknown> = {}
    for (const [k, v] of rows) {
      const trimmedKey = k.trim()
      if (!trimmedKey) continue
      const num = Number(v)
      if (v === 'true') obj[trimmedKey] = true
      else if (v === 'false') obj[trimmedKey] = false
      else if (v !== '' && !Number.isNaN(num) && /^-?\d+(\.\d+)?$/.test(v.trim())) obj[trimmedKey] = num
      else obj[trimmedKey] = v
    }
    onSaveConfig(obj)
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        Eklenti yapılandırması anahtar-değer formatında. Değişiklikler yerel olarak saklanır.
      </p>
      <div className="space-y-2" data-testid="plugin-config-editor">
        {rows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={row[0]}
              onChange={(e) => handleUpdate(idx, 'k', e.target.value)}
              placeholder="anahtar"
              aria-label={`Yapılandırma anahtarı ${idx + 1}`}
              className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-[12px] outline-none focus:border-foreground/40"
            />
            <input
              type="text"
              value={row[1]}
              onChange={(e) => handleUpdate(idx, 'v', e.target.value)}
              placeholder="değer"
              aria-label={`Yapılandırma değeri ${idx + 1}`}
              className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-[12px] outline-none focus:border-foreground/40"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, ['', '']])}
        className="text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
      >
        + Satır ekle
      </button>
      {onSaveConfig && (
        <button
          type="button"
          onClick={handleSave}
          data-testid="plugin-config-save"
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          <Save className="h-4 w-4" />
          Kaydet
        </button>
      )}
    </div>
  )
}

function ChangelogPane({ plugin }: { plugin: Plugin }) {
  const entries = plugin.changelog ?? []
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-5 text-center text-[13px] text-muted-foreground">
        Bu eklentinin changelog kaydı henüz yok.
      </div>
    )
  }
  return (
    <ol className="space-y-3" data-testid="plugin-changelog">
      {entries.map((entry) => (
        <li key={entry.version} className="rounded-xl border border-border bg-background/40 p-3">
          <header className="mb-1 flex items-baseline justify-between gap-2">
            <span className="font-mono text-[12px] font-medium">v{entry.version}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{entry.date}</span>
          </header>
          <ul className="space-y-1 text-[12.5px]">
            {entry.changes.map((c, i) => (
              <li key={i} className="text-muted-foreground">
                · {c}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
