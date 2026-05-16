// Wave F21.B — Rol bazlı 2FA enforcement policy paneli.
// ROLES (5 rol) için "2FA zorunlu" toggle. setTwoFaPolicy F21.0 lib'inden
// IMPORT only — store mutasyonu + version bump ile yerel re-render.

import { useMemo, useState } from 'react'
import { Info, ShieldCheck, ShieldOff } from '@landx/icons'
import { ROLES, type RoleDef } from '@landx/data'
import { getTwoFaPolicy, setTwoFaPolicy } from '@/lib/ip-allowlist'

export function TwoFaPolicyPanel() {
  const [version, setVersion] = useState(0)
  const policy = useMemo(
    () => getTwoFaPolicy(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  )

  const togglePolicy = (role: RoleDef) => {
    const current = policy[role.id] === true
    setTwoFaPolicy(role.id, !current)
    setVersion((v) => v + 1)
  }

  const requiredCount = ROLES.filter((r) => policy[r.id] === true).length

  return (
    <section
      data-testid="twofa-policy-panel"
      className="rounded-2xl border border-border bg-card"
    >
      <header className="flex flex-col gap-2 border-b border-border/60 px-5 py-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            2FA · ROL POLİTİKASI
          </div>
          <h3 className="mt-1 font-serif text-lg font-light tracking-tight">
            Rol bazlı{' '}
            <em className="font-serif italic font-light">zorunluluk</em>
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {requiredCount}/{ROLES.length} rol zorunlu
        </span>
      </header>

      <ul>
        {ROLES.map((role, i) => {
          const required = policy[role.id] === true
          return (
            <li
              key={role.id}
              data-testid="twofa-policy-row"
              data-role-id={role.id}
              className={
                'flex items-center justify-between gap-3 px-5 py-3 ' +
                (i < ROLES.length - 1 ? 'border-b border-border/60' : '')
              }
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {role.id}
                  </span>
                  <span className="text-[13.5px] font-medium">{role.name}</span>
                </div>
                <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                  {role.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  data-testid="twofa-policy-state"
                  className={
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ' +
                    (required
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-foreground/[0.06] text-muted-foreground')
                  }
                >
                  {required ? (
                    <>
                      <ShieldCheck className="h-3 w-3" /> Zorunlu
                    </>
                  ) : (
                    <>
                      <ShieldOff className="h-3 w-3" /> Opsiyonel
                    </>
                  )}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={required}
                  data-testid="twofa-policy-toggle"
                  aria-label={`${role.name} için 2FA zorunluluk`}
                  onClick={() => togglePolicy(role)}
                  className={
                    'relative h-5 w-9 flex-none rounded-full transition-colors ' +
                    (required
                      ? 'bg-foreground'
                      : 'bg-foreground/[0.12] hover:bg-foreground/20')
                  }
                >
                  <span
                    className={
                      'absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-all ' +
                      (required ? 'left-[18px]' : 'left-0.5')
                    }
                  />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <footer className="flex items-start gap-2 border-t border-border/60 px-5 py-3">
        <Info className="h-3.5 w-3.5 flex-none translate-y-[1px] text-muted-foreground" />
        <p className="text-[11.5px] text-muted-foreground">
          Politika değişiklikleri audit log'a yansır. Zorunlu role atanan
          operatörler, sonraki girişte 2FA enroll akışına yönlendirilir.
        </p>
      </footer>
    </section>
  )
}

export default TwoFaPolicyPanel
