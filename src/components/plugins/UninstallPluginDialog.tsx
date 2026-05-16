import { useEffect } from 'react'
import { AlertTriangle, X } from '@landx/icons'
import type { Plugin } from '@/lib/platform-plugins'

export interface UninstallPluginDialogProps {
  plugin: Plugin
  onConfirm: () => void
  onClose: () => void
}

export function UninstallPluginDialog({ plugin, onConfirm, onClose }: UninstallPluginDialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${plugin.name} eklentisini kaldır`}
      data-testid="uninstall-plugin-dialog"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 -z-10"
      />
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-rose-500/10">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-300" />
            </span>
            <div>
              <h2 className="font-serif text-xl font-light tracking-tight">Eklentiyi kaldır</h2>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {plugin.name}
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
          <p className="text-[13px] leading-relaxed">
            <strong>{plugin.name}</strong> eklentisi kaldırılacak.
          </p>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] leading-relaxed text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <strong>Uyarı:</strong> Bu eklentinin yapılandırması ve verisi silinecek. Yeniden yüklerseniz tüm ayarları baştan yapmanız gerekir.
          </div>
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
            data-testid="uninstall-confirm"
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
          >
            Evet, kaldır
          </button>
        </footer>
      </div>
    </div>
  )
}
