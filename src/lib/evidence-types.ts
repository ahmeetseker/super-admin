// Compliance evidence file metadata (UI-only, sessionStorage-persisted).

export interface EvidenceFile {
  id: string
  checkId: string
  name: string
  size: number
  type: string
  uploadedAt: string
}

export const MAX_FILES = 5
export const MAX_SIZE_MB = 10
export const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export const ACCEPTED_TYPES: ReadonlyArray<string> = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/csv',
]

export const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.csv'

export type ValidationError =
  | { kind: 'too-many'; max: number }
  | { kind: 'too-large'; name: string; maxMb: number }
  | { kind: 'bad-type'; name: string }

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
