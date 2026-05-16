import { useMemo, useState } from 'react'
import { Settings as SettingsIcon, Shield, Mail, Cable, BadgeCheck, AlertTriangle, Pencil, Check, X, Sun, Moon, Monitor } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { useTheme, type Theme } from '@landx/ui/theme'
import { PLATFORM_SETTINGS, type PlatformSetting } from '@landx/data'

type Category = PlatformSetting['category']

const CATEGORY_LABEL: Record<Category, string> = {
  general: 'Genel',
  security: 'Güvenlik',
  email: 'Email',
  api: 'API',
  compliance: 'Uyumluluk',
}

const CATEGORY_ICON: Record<Category, React.ComponentType<{ className?: string }>> = {
  general: SettingsIcon,
  security: Shield,
  email: Mail,
  api: Cable,
  compliance: BadgeCheck,
}

const CATEGORY_ORDER: ReadonlyArray<Category> = ['general', 'security', 'email', 'api', 'compliance']

function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function displayValue(s: PlatformSetting): string {
  if (s.type === 'boolean') return s.value ? 'Açık' : 'Kapalı'
  return String(s.value)
}

export function PlatformSettings() {
  const [active, setActive] = useState<Category>('general')

  const grouped = useMemo(() => {
    const m: Record<Category, PlatformSetting[]> = {
      general: [], security: [], email: [], api: [], compliance: [],
    }
    PLATFORM_SETTINGS.forEach((s) => m[s.category].push(s))
    return m
  }, [])

  const items = grouped[active]

  return (
    <PageShell
      eyebrow="MOD · PLATFORM · SETTINGS"
      title={
        <>
          Platform <em className="font-serif italic font-light">ayarları</em>
        </>
      }
      description={`${PLATFORM_SETTINGS.length} ayar · 5 kategori · değişiklikler audit log'a düşer.`}
    >
      <section className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600 dark:text-amber-400" />
        <div className="text-[13px] leading-relaxed text-foreground/80">
          <strong className="font-medium text-foreground">Dikkat.</strong> Bu ayarlar tüm platformu etkiler. Yapılan her değişiklik
          {' '}<span className="font-mono text-[11px]">audit_log</span>'a düşer ve geri alınamaz şekilde versiyonlanır.
        </div>
      </section>

      <AppearanceCard />


      <section className="mb-5 -mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {CATEGORY_ORDER.map((c) => {
            const Icon = CATEGORY_ICON[c]
            const isActive = active === c
            const count = grouped[c].length
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={cn(
                  'inline-flex flex-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                  isActive ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {CATEGORY_LABEL[c]}
                <span className={cn('rounded-full px-1.5 font-mono text-[10px] tabular-nums', isActive ? 'bg-background/20' : 'bg-foreground/[0.06]')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {items.map((s) => (
            <SettingRow key={s.key} setting={s} />
          ))}
        </ul>
      </section>

      <section className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/40 p-4">
        <div className="text-[12.5px] text-muted-foreground">
          Tüm değişiklikler tek transaction olarak commit edilir. İptal de aynı şekilde.
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> İptal
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90"
          >
            <Check className="h-3.5 w-3.5" /> Değişiklikleri kaydet
          </button>
        </div>
      </section>
    </PageShell>
  )
}

function SettingRow({ setting }: { setting: PlatformSetting }) {
  return (
    <li className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[1.4fr_1fr_auto] md:items-center md:gap-5">
      <div>
        <div className="flex items-baseline gap-2">
          <h3 className="font-serif text-base font-light tracking-tight">{setting.label}</h3>
          <span className="font-mono text-[10px] text-muted-foreground">{setting.key}</span>
        </div>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{setting.description}</p>
      </div>

      <div className="md:max-w-[260px]">
        {setting.type === 'boolean' ? (
          <ValueChip value={Boolean(setting.value)} />
        ) : setting.type === 'select' ? (
          <SelectPreview value={String(setting.value)} options={setting.options ?? []} />
        ) : (
          <ReadOnlyInput value={displayValue(setting)} mono={setting.type === 'number' || setting.key.startsWith('email')} />
        )}
        <div className="mt-1.5 font-mono text-[10px] text-muted-foreground">
          Son: {dateShort(setting.lastChangedISO)} · {setting.lastChangedBy}
        </div>
      </div>

      <div className="flex md:justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04]"
        >
          <Pencil className="h-3 w-3" /> Düzenle
        </button>
      </div>
    </li>
  )
}

function ValueChip({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium',
        value
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'bg-stone-500/10 text-stone-600 dark:text-stone-400',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', value ? 'bg-emerald-500' : 'bg-stone-400')} />
      {value ? 'Açık' : 'Kapalı'}
    </span>
  )
}

function SelectPreview({ value, options }: { value: string; options: string[] }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-1.5 font-mono text-[12px] text-foreground/80">
      {value}
      <span className="text-[10px] text-muted-foreground">({options.length} seçenek)</span>
    </div>
  )
}

function ReadOnlyInput({ value, mono }: { value: string; mono: boolean }) {
  return (
    <div
      className={cn(
        'truncate rounded-lg border border-border bg-background/60 px-3 py-1.5 text-[12.5px] text-foreground/80',
        mono && 'font-mono text-[12px]',
      )}
      title={value}
    >
      {value}
    </div>
  )
}

const APPEARANCE_OPTIONS: ReadonlyArray<{ value: Theme; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'light', label: 'Aydınlık', Icon: Sun },
  { value: 'dark', label: 'Karanlık', Icon: Moon },
  { value: 'system', label: 'Sistem', Icon: Monitor },
]

function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  return (
    <section
      data-settings-appearance=""
      className="mb-5 rounded-2xl border border-border bg-card p-5"
    >
      <header className="mb-3 flex items-baseline gap-2">
        <h3 className="font-serif text-base font-light tracking-tight">Görünüm</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">tema</span>
      </header>
      <p className="mb-4 text-[12.5px] leading-relaxed text-muted-foreground">
        Konsol arayüzünün tema modu. Tercih bu tarayıcıya kaydedilir.
      </p>
      <div role="radiogroup" aria-label="Tema seçimi" className="flex flex-wrap gap-2">
        {APPEARANCE_OPTIONS.map(({ value, label, Icon }) => {
          const active = theme === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              data-settings-appearance-option={value}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-medium transition',
                active
                  ? 'border-foreground/30 bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
