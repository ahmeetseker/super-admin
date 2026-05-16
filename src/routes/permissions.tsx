import { useState } from 'react'
import { Shield, Check, X, Pencil, Users } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  ROLES,
  RESOURCES,
  ACTIONS,
  RESOURCE_LABEL,
  ACTION_LABEL,
  type RoleDef,
  type Resource,
  type Action,
} from '@landx/data'

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

function roleHasAction(role: RoleDef, resource: Resource, action: Action): boolean {
  const entry = role.permissions.find((p) => p.resource === resource)
  if (!entry) return false
  return entry.actions.includes(action)
}

function totalGrants(role: RoleDef): number {
  return role.permissions.reduce((s, p) => s + p.actions.length, 0)
}

export function Permissions() {
  const [activeRoleId, setActiveRoleId] = useState<RoleDef['id']>(ROLES[0].id)
  const activeRole = ROLES.find((r) => r.id === activeRoleId)!
  const maxGrants = RESOURCES.length * ACTIONS.length
  const totalMembers = ROLES.reduce((s, r) => s + r.memberCount, 0)
  const writeRoles = ROLES.filter((r) =>
    r.permissions.some((p) => p.actions.some((a) => a !== 'read')),
  ).length

  return (
    <PageShell
      eyebrow="MOD · I04 · PERMISSIONS"
      title={
        <>
          Yetki <em className="font-serif italic font-light">matrisi</em>
        </>
      }
      description={`${ROLES.length} rol · ${totalMembers} kullanıcı · ${RESOURCES.length} kaynak × ${ACTIONS.length} aksiyon. RBAC, ileride ABAC genişlemesi.`}
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Toplam rol" value={String(ROLES.length)} hint="sistem + custom" />
        <Stat label="Atanan kullanıcı" value={String(totalMembers)} hint="aktif super-admin paneli" />
        <Stat label="Yazma yetkili rol" value={String(writeRoles)} hint="read-dışı aksiyon var" />
        <Stat label="Aktif rol grantları" value={String(totalGrants(activeRole))} hint={`/ ${maxGrants} olası`} />
      </section>

      <section className="mb-5 -mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {ROLES.map((r) => {
            const active = activeRoleId === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRoleId(r.id)}
                className={cn(
                  'inline-flex flex-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                  active ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Shield className="h-3 w-3" />
                {r.name}
                <span
                  className={cn(
                    'rounded-full px-1.5 font-mono text-[10px] tabular-nums',
                    active ? 'bg-background/20' : 'bg-foreground/[0.06]',
                  )}
                >
                  {r.memberCount}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{activeRole.id}</div>
          <h3 className="mt-1 font-serif text-xl font-light tracking-tight">{activeRole.name}</h3>
          <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">{activeRole.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-[12px]">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <strong className="font-medium">{activeRole.memberCount}</strong>
            <span className="text-muted-foreground">kullanıcı</span>
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-foreground text-background px-3 py-2 text-sm font-medium transition hover:opacity-90"
          >
            <Pencil className="h-3.5 w-3.5" />
            Rolü düzenle
          </button>
        </div>
      </section>

      <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="bg-muted/40">
                <th className="sticky left-0 z-10 border-b border-border bg-muted/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Kaynak
                </th>
                {ACTIONS.map((a) => (
                  <th key={a} className="border-b border-border px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {ACTION_LABEL[a]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((res) => (
                <tr key={res} className="group">
                  <td className="sticky left-0 z-10 border-b border-border/60 bg-card px-4 py-3 text-[13px] font-medium group-last:border-0">
                    {RESOURCE_LABEL[res]}
                  </td>
                  {ACTIONS.map((act) => {
                    const allowed = roleHasAction(activeRole, res, act)
                    return (
                      <td key={act} className="border-b border-border/60 px-3 py-3 text-center group-last:border-0">
                        {allowed ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/[0.06] text-rose-500/60 dark:bg-rose-400/[0.06] dark:text-rose-300/40">
                            <X className="h-3 w-3" />
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section>
        <header className="mb-3 flex items-baseline justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{activeRole.name.toUpperCase()} ROLÜNDE</div>
            <h3 className="mt-1 font-serif text-lg font-light tracking-tight">
              Atanmış <em className="font-serif italic font-light">kullanıcılar</em>
            </h3>
          </div>
          <div className="text-[12px] text-muted-foreground">{activeRole.memberCount} kişi</div>
        </header>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul>
            {activeRole.members.map((m, i) => (
              <li key={m.email} className={cn('flex items-center justify-between px-4 py-3', i < activeRole.members.length - 1 && 'border-b border-border/60')}>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.08] font-mono text-[11px] uppercase">
                    {m.email.charAt(0)}
                  </span>
                  <div>
                    <div className="text-[14px]">{m.email}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">son aktif {relativeTime(m.lastActiveISO)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                >
                  Yönet
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}
