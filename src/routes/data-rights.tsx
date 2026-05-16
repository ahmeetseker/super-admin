// Wave F21.C — /data-rights GDPR export + KVKK delete dashboard.
//
// Üç section:
//   1. ExportRequestForm  — tenant başına JSON bundle preview + Blob download
//   2. DeleteWorkflow     — 4-step (preview → SİL <name> doğrulama → 3s
//                          countdown + cancel → tamamlandı banner)
//   3. RequestHistoryTable — `listRequests()` desc + tip filtresi
//
// `lib/data-rights` mutasyonları localStorage'a (audit trail) yazıyor; rev'i
// `historyTick` ile bump ederek History tablosunu yeniden çek.

import { useCallback, useState } from 'react'
import { PageShell } from '@landx/ui'
import { listRequests } from '@/lib/data-rights'
import { ExportRequestForm } from '@/components/data-rights/ExportRequestForm'
import { DeleteWorkflow } from '@/components/data-rights/DeleteWorkflow'
import { RequestHistoryTable } from '@/components/data-rights/RequestHistoryTable'

export function DataRights() {
  // Re-read the local audit trail whenever a workflow lands a new request.
  // `listRequests` reads from localStorage on every call — bumping a tick value
  // forces a re-render which pulls a fresh snapshot.
  const [historyTick, setHistoryTick] = useState(0)
  const bumpHistory = useCallback(() => setHistoryTick((t) => t + 1), [])

  return (
    <PageShell
      eyebrow="OPS · VERİ HAKLARI"
      title={
        <>
          Veri <em className="font-serif italic font-light text-muted-foreground">hakları</em>
        </>
      }
      description="GDPR veri ihracı ve KVKK silme talepleri."
    >
      <div data-testid="data-rights-dashboard" className="flex flex-col gap-6">
        <ExportRequestForm onCommitted={bumpHistory} />
        <DeleteWorkflow onCompleted={bumpHistory} />
        <RequestHistoryTable key={historyTick} rows={listRequests()} />
      </div>
    </PageShell>
  )
}

export default DataRights
