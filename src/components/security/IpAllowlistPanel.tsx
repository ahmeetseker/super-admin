// Wave F21.B — IP allowlist panel.
// Tenant seçici + listAllowEntries tablosu + ekle/sil aksiyonları. F21.0
// ip-allowlist lib'inden IMPORT only — store mutasyonu burada yapılır,
// addAllowEntry/removeAllowEntry callback'leri via local re-render state'i
// tetikler (localStorage tek kaynak, useState sadece "version bump").

import { useMemo, useState } from 'react'
import { Plus, Trash2, ShieldCheck } from '@landx/icons'
import { TENANTS, type Tenant } from '@landx/data'
import {
  listAllowEntries,
  removeAllowEntry,
  cidrSize,
  type IpAllowEntry,
} from '@/lib/ip-allowlist'
import { AddCidrModal } from './AddCidrModal'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function fmtSize(cidr: string): string {
  const n = cidrSize(cidr)
  return n === 1 ? '1 IP' : `${n.toLocaleString('tr-TR')} IP`
}

export interface IpAllowlistPanelProps {
  /** Optional initial tenant id (defaults to first TENANTS entry). */
  initialTenantId?: string
}

export function IpAllowlistPanel({ initialTenantId }: IpAllowlistPanelProps = {}) {
  const [tenantId, setTenantId] = useState<string>(
    initialTenantId ?? TENANTS[0]?.id ?? '',
  )
  const [modalOpen, setModalOpen] = useState(false)
  // Version counter — bump after add/remove to re-derive listAllowEntries.
  const [version, setVersion] = useState(0)

  const activeTenant = useMemo<Tenant | undefined>(
    () => TENANTS.find((t) => t.id === tenantId),
    [tenantId],
  )

  const entries = useMemo<IpAllowEntry[]>(
    () => listAllowEntries(tenantId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenantId, version],
  )

  const handleRemove = (id: string) => {
    removeAllowEntry(id)
    setVersion((v) => v + 1)
  }

  return (
    <section
      data-testid="ip-allowlist-panel"
      className="rounded-2xl border border-border bg-card"
    >
      <header className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            IP ALLOWLIST · CIDR
          </div>
          <h3 className="mt-1 font-serif text-lg font-light tracking-tight">
            Tenant başına izinli{' '}
            <em className="font-serif italic font-light">aralıklar</em>
          </h3>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            Allowlist boş ise tüm IP'ler kabul edilir. En az 1 CIDR eklendiğinde
            yalnızca eşleşen istemciler oturum açabilir.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[12.5px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Tenant
            </span>
            <select
              data-testid="ip-allowlist-tenant-select"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="border-0 bg-transparent text-[13px] outline-none"
            >
              {TENANTS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            data-testid="ip-allowlist-add-cta"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            CIDR ekle
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        {entries.length === 0 ? (
          <div
            data-testid="ip-allowlist-empty"
            className="flex flex-col items-center gap-2 px-6 py-12 text-center"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/[0.06]">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </span>
            <div className="text-[13px] text-foreground">
              Henüz CIDR eklenmedi.
            </div>
            <div className="max-w-sm text-[11.5px] text-muted-foreground">
              Bu tenant için allowlist boş — şu an her IP'den giriş yapılabilir.
              Kısıtlamak için bir CIDR ekleyin.
            </div>
          </div>
        ) : (
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="bg-muted/40">
                <th className="border-b border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  CIDR
                </th>
                <th className="border-b border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Etiket
                </th>
                <th className="border-b border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Eklenme
                </th>
                <th className="border-b border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Ekleyen
                </th>
                <th className="border-b border-border px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Aksiyon
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr
                  key={e.id}
                  data-testid="ip-allowlist-row"
                  data-entry-id={e.id}
                  className="group"
                >
                  <td
                    className={
                      'px-4 py-3 font-mono text-[12px] ' +
                      (i < entries.length - 1
                        ? 'border-b border-border/60'
                        : '')
                    }
                  >
                    <div className="text-foreground">{e.cidr}</div>
                    <div className="text-[10.5px] text-muted-foreground">
                      {fmtSize(e.cidr)}
                    </div>
                  </td>
                  <td
                    className={
                      'px-4 py-3 text-[13px] ' +
                      (i < entries.length - 1
                        ? 'border-b border-border/60'
                        : '')
                    }
                  >
                    {e.label ?? (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td
                    className={
                      'px-4 py-3 font-mono text-[11.5px] text-muted-foreground ' +
                      (i < entries.length - 1
                        ? 'border-b border-border/60'
                        : '')
                    }
                  >
                    {fmtDate(e.createdISO)}
                  </td>
                  <td
                    className={
                      'px-4 py-3 font-mono text-[11.5px] text-muted-foreground ' +
                      (i < entries.length - 1
                        ? 'border-b border-border/60'
                        : '')
                    }
                  >
                    {e.createdBy}
                  </td>
                  <td
                    className={
                      'px-4 py-3 text-right ' +
                      (i < entries.length - 1
                        ? 'border-b border-border/60'
                        : '')
                    }
                  >
                    <button
                      type="button"
                      data-testid="ip-allowlist-remove"
                      aria-label={`${e.cidr} kaldır`}
                      onClick={() => handleRemove(e.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300"
                    >
                      <Trash2 className="h-3 w-3" />
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && activeTenant && (
        <AddCidrModal
          tenant={activeTenant}
          onClose={() => setModalOpen(false)}
          onAdded={() => {
            setModalOpen(false)
            setVersion((v) => v + 1)
          }}
        />
      )}
    </section>
  )
}

export default IpAllowlistPanel
