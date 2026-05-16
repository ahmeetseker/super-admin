import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { UploadCloud } from '@landx/icons'
import { cn } from '@landx/ui'
import { ACCEPTED_EXTENSIONS, MAX_FILES, MAX_SIZE_MB } from '@/lib/evidence-types'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export function DropZone({ onFiles, disabled = false }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [over, setOver] = useState(false)

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setOver(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) onFiles(files)
  }

  function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onFiles(files)
    e.target.value = ''
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={cn(
        'rounded-2xl border border-dashed p-6 text-center transition focus-within:ring-2 focus-within:ring-foreground/20',
        over && !disabled ? 'border-foreground/40 bg-foreground/[0.04]' : 'border-border bg-background/40',
        disabled && 'opacity-50',
      )}
    >
      <UploadCloud className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="mt-2 font-serif text-base font-light tracking-tight">
        Dosyaları <em className="font-serif italic font-light">sürükle</em> veya seç
      </p>
      <p className="mt-1 text-[11.5px] text-muted-foreground">
        En fazla {MAX_FILES} dosya · her biri ≤ {MAX_SIZE_MB}MB · pdf, png, jpg, csv
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Dosya seç
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS}
        onChange={handlePick}
        className="sr-only"
        aria-label="Kanıt dosyası seç"
      />
    </div>
  )
}
