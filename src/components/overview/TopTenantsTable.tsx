// TopTenantsTable — top-5 tenants by MRR on the super-admin overview.
// Wave F3 / Agent-F3D.
//
// Click row → /tenants/{id} (existing route). Token-only chips (no rose /
// emerald) — plan + status differentiated by foreground-opacity weighting.

import { useNavigate } from 'react-router'
import { Building2 } from '@landx/icons'
import { cn, formatTLCompact } from '@landx/ui'
import type { Tenant } from '@landx/data'

interface TopTenantsTableProps {
  rows: readonly Tenant[]
  loading?: boolean
}

const PLAN_CHIP: Record<Tenant['plan'], string> = {
  Free: 'bg-foreground/[0.04] text-foreground/70',
  Pro: 'bg-foreground/[0.08] text-foreground',
  Enterprise: 'bg-foreground text-background',
}

// Status indicator weight — Aktif/Trial darker, Askıda/Churned lighter.
// No rose/emerald — distinguish by opacity only, per F3D brief.
const STATUS_DOT: Record<Tenant['status'], string> = {
  Aktif: 'bg-foreground',
  Trial: 'bg-foreground/70',
  Askıda: 'bg-foreground/40',
  Churned: 'bg-foreground/25',
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

export function TopTenantsTable({ rows, loading }: TopTenantsTableProps) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Ciroya göre
          </div>
          <div className="font-serif text-base">Top tenant</div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          ilk 5
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border/60 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-4 py-2">Tenant</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2 text-right">MRR</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2 text-right">Son aktif</th>
            </tr>
          </thead>
          <tbody data-testid="top-tenants-rows">
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                  Yükleniyor…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                  Henüz tenant yok.
                </td>
              </tr>
            )}
            {rows.map((t) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tenants/${t.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/tenants/${t.id}`)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${t.name} tenant detayına git`}
                data-testid={`top-tenant-row-${t.id}`}
                className="cursor-pointer border-b border-border/40 outline-none transition last:border-0 hover:bg-foreground/[0.02] focus-visible:bg-foreground/[0.04]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-foreground/[0.08]"
                    >
                      <Building2 className="h-3.5 w-3.5 text-foreground/70" />
                    </span>
                    <div>
                      <div className="text-[13px] font-medium leading-tight">{t.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {t.id} · {t.city}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px]',
                      PLAN_CHIP[t.plan],
                    )}
                  >
                    {t.plan}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-serif tabular-nums">
                  {t.mrr > 0 ? formatTLCompact(t.mrr) : '—'}
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1.5 text-[12px]">
                    <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[t.status])} />
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
                  {relativeTime(t.lastActiveISO)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
