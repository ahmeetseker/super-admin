/**
 * /offline — Wave F30.A
 *
 * Static fallback page surfaced by the service worker when a network
 * request fails and no cached response is available. Live `useOnline`
 * indicator + reload button — operator can retry the moment
 * connectivity returns without losing their place in the SPA.
 */

import { CloudOff, RefreshCw } from '@landx/icons'
import { useOnline } from '@landx/ui/lib'

export function Offline() {
  const online = useOnline()

  const handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-12">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          PLATFORM · ÇEVRİMDIŞI
        </p>
        <h1 className="mt-2 font-serif text-4xl font-light tracking-tight">
          Bağlantı <em className="font-serif italic font-light">yok</em>
        </h1>
        <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
          Ops konsoluna ulaşmak için aktif internet gerekiyor. Bağlantın geri
          geldiğinde sayfayı yenileyerek devam edebilirsin.
        </p>
      </header>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/[0.06] text-foreground/80">
          <CloudOff className="h-6 w-6" />
        </span>
        <div className="space-y-2">
          <p className="font-serif text-xl tracking-tight">
            {online ? 'Bağlantı geri geldi' : 'İnternet erişimi yok'}
          </p>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            {online
              ? 'Sayfayı yenileyerek konsola dönebilirsin.'
              : 'Wi-Fi veya VPN bağlantını kontrol et. Bağlantın döndüğünde bu durum otomatik güncellenecek.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleReload}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background transition hover:bg-foreground/90"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Yeniden dene
        </button>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          durum · {online ? 'çevrimiçi' : 'çevrimdışı'}
        </p>
      </div>
    </div>
  )
}
