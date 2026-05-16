import { useEffect, useState, useCallback } from 'react'
import { X, Trash2, FileText, ShieldCheck } from '@landx/icons'
import { cn, timeAgo } from '@landx/ui'
import {
  ACCEPTED_TYPES,
  MAX_FILES,
  MAX_SIZE_BYTES,
  MAX_SIZE_MB,
  formatBytes,
  type EvidenceFile,
  type ValidationError,
} from '@/lib/evidence-types'
import { addFiles, getEvidence, makeId, removeFile } from '@/lib/evidence-store'
import { DropZone } from './DropZone'

interface EvidenceDrawerProps {
  open: boolean
  onClose: () => void
  checkId: string
  controlNumber: string
  controlTitle: string
}

export function EvidenceDrawer({ open, onClose, checkId, controlNumber, controlTitle }: EvidenceDrawerProps) {
  const [files, setFiles] = useState<EvidenceFile[]>(() => getEvidence(checkId))
  const [errors, setErrors] = useState<ValidationError[]>([])

  useEffect(() => {
    if (open) {
      setFiles(getEvidence(checkId))
      setErrors([])
    }
  }, [open, checkId])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleFiles = useCallback(
    (incoming: File[]) => {
      const next: EvidenceFile[] = []
      const errs: ValidationError[] = []
      const room = MAX_FILES - files.length
      if (incoming.length > room) {
        errs.push({ kind: 'too-many', max: MAX_FILES })
      }
      for (const f of incoming.slice(0, Math.max(0, room))) {
        const okType =
          ACCEPTED_TYPES.includes(f.type) ||
          /\.(pdf|png|jpe?g|csv)$/i.test(f.name)
        if (!okType) {
          errs.push({ kind: 'bad-type', name: f.name })
          continue
        }
        if (f.size > MAX_SIZE_BYTES) {
          errs.push({ kind: 'too-large', name: f.name, maxMb: MAX_SIZE_MB })
          continue
        }
        next.push({
          id: makeId(),
          checkId,
          name: f.name,
          size: f.size,
          type: f.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
        })
      }
      if (next.length > 0) {
        const merged = addFiles(checkId, next)
        setFiles(merged)
      }
      setErrors(errs)
    },
    [files.length, checkId],
  )

  const handleRemove = useCallback(
    (id: string) => {
      const next = removeFile(checkId, id)
      setFiles(next)
    },
    [checkId],
  )

  if (!open) return null

  const atCap = files.length >= MAX_FILES

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-drawer-title"
      className="fixed inset-0 z-50 flex justify-end"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />
      <aside className="relative flex h-full w-full max-w-[480px] flex-col border-l border-border bg-card shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {controlNumber} · KANIT
            </div>
            <h2 id="evidence-drawer-title" className="mt-1 truncate font-serif text-lg font-light tracking-tight">
              {controlTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
            aria-label="Çekmeceyi kapat"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <DropZone onFiles={handleFiles} disabled={atCap} />

          {errors.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[12px] text-rose-700 dark:text-rose-300">
              {errors.map((e, i) => (
                <li key={i}>
                  {e.kind === 'too-many' && `En fazla ${e.max} dosya ekleyebilirsin.`}
                  {e.kind === 'too-large' && `${e.name} — boyut limiti ${e.maxMb}MB`}
                  {e.kind === 'bad-type' && `${e.name} — desteklenmeyen tip (pdf/png/jpg/csv)`}
                </li>
              ))}
            </ul>
          )}

          <section className="mt-5">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Yüklü kanıtlar
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {files.length}/{MAX_FILES}
              </div>
            </div>

            {files.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-[12px] text-muted-foreground">
                Henüz kanıt yok.
              </div>
            ) : (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-foreground/[0.06] text-muted-foreground">
                      <FileText className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium" title={f.name}>
                        {f.name}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground tabular-nums">
                        <span>{formatBytes(f.size)}</span>
                        <span aria-hidden>·</span>
                        <span>{timeAgo(f.uploadedAt)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(f.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300"
                      aria-label={`${f.name} dosyasını sil`}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      Sil
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer
          className={cn(
            'flex items-center gap-2 border-t border-border bg-background/40 px-5 py-3',
            'text-[11.5px] text-muted-foreground',
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5 flex-none" aria-hidden />
          <span>Bu eylem audit log&apos;a yansır.</span>
        </footer>
      </aside>
    </div>
  )
}

export default EvidenceDrawer
