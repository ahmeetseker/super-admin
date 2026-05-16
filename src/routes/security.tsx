// Wave F21.B — /security route: per-tenant IP allowlist + 2FA enforcement.
// F21.0 ip-allowlist + operator-store lib'leri IMPORT only. Sayfa 2 ana
// section'a bölünür: üstte allowlist (tenant scope + CIDR tablosu), altta
// 2FA enforcement (coverage stats + rol bazlı policy toggle).

import { useMemo } from 'react'
import { PageShell } from '@landx/ui'
import { TENANTS } from '@landx/data'
import { listAllowEntries, getTwoFaPolicy } from '@/lib/ip-allowlist'
import { get2faCoverage } from '@/lib/operator-store'
import { IpAllowlistPanel } from '@/components/security/IpAllowlistPanel'
import { TwoFaEnforcementCard } from '@/components/security/TwoFaEnforcementCard'
import { TwoFaPolicyPanel } from '@/components/security/TwoFaPolicyPanel'

export function Security() {
  const summary = useMemo(() => {
    const entriesAll = TENANTS.reduce(
      (sum, t) => sum + listAllowEntries(t.id).length,
      0,
    )
    const policy = getTwoFaPolicy()
    const requiredRoles = Object.values(policy).filter(Boolean).length
    const coverage = get2faCoverage()
    return { entriesAll, requiredRoles, coverage }
  }, [])

  return (
    <PageShell
      eyebrow="OPS · GÜVENLİK"
      title={
        <>
          Güvenlik{' '}
          <em className="font-serif italic font-light text-muted-foreground">
            politikası
          </em>
        </>
      }
      description="Per-tenant IP allowlist (CIDR) ve rol bazlı 2FA zorunluluğu."
    >
      <section
        data-testid="security-summary"
        className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <Stat
          label="Toplam CIDR"
          value={String(summary.entriesAll)}
          hint={`${TENANTS.length} tenant arası`}
        />
        <Stat
          label="2FA zorunlu rol"
          value={String(summary.requiredRoles)}
          hint="enforcement policy"
        />
        <Stat
          label="Enroll oranı"
          value={`${summary.coverage.rate}%`}
          hint={`${summary.coverage.enrolled}/${summary.coverage.enrolled + summary.coverage.missing}`}
        />
        <Stat
          label="Eksik operatör"
          value={String(summary.coverage.missing)}
          hint="2FA yok"
        />
      </section>

      <div className="mb-8">
        <IpAllowlistPanel />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <TwoFaEnforcementCard />
        <TwoFaPolicyPanel />
      </div>
    </PageShell>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}

export default Security
