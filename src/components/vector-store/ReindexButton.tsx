// Wave F12.D — vector store reindex button + confirm modal.
// Triggers reindexCollection (status='reindexing' → 2sn → 'active').
import { useState } from 'react'
import { RefreshCw, X } from '@landx/icons'
import {
  reindexCollection,
  formatCompact,
  type VectorCollection,
} from '@/lib/platform-vector'

interface ReindexButtonProps {
  collection: VectorCollection
}

export function ReindexButton({ collection }: ReindexButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isReindexing = collection.status === 'reindexing'

  function handleConfirm() {
    reindexCollection(collection.id)
    setConfirmOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={isReindexing}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
        data-testid={`reindex-button-${collection.id}`}
      >
        <RefreshCw
          className={`h-3 w-3 ${isReindexing ? 'animate-spin' : ''}`}
        />
        {isReindexing ? 'İndeksleniyor…' : 'Yeniden indeksle'}
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setConfirmOpen(false)}
          data-testid={`reindex-confirm-overlay-${collection.id}`}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid={`reindex-confirm-dialog-${collection.id}`}
            role="dialog"
            aria-modal="true"
          >
            <header className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg font-light tracking-tight">
                  Yeniden indeksle
                </h3>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {collection.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground"
                aria-label="İptal"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="mb-4 rounded-xl border border-border bg-background/40 p-3 text-[12.5px] leading-relaxed text-foreground/80">
              <strong className="font-medium text-foreground">
                {formatCompact(collection.vectorCount)}
              </strong>{' '}
              vektör (boyut {collection.dimension}) yeniden hesaplanacak.
              İşlem yaklaşık 2 saniye sürer (mock). Sorgu kesintisi olabilir.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-border bg-background/60 px-3 py-1.5 text-[12.5px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04]"
                data-testid={`reindex-cancel-${collection.id}`}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-lg border border-foreground/30 bg-foreground/[0.08] px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-foreground/[0.14]"
                data-testid={`reindex-confirm-accept-${collection.id}`}
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
