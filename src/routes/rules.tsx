/**
 * /rules — Wave F36 / Faz 2 / Slice A.
 *
 * ECA (Event ▸ Condition ▸ Action) Rule Engine editor. Split layout:
 *   - 4 KPI bar üstte (toplam / aktif / 24h tetik / dry-run sayısı)
 *   - Sol pane (320px, sticky): rule listesi + enabled chip + event filter
 *   - Sağ pane: 5 tab — Genel | Koşullar | Aksiyonlar | Dry-Run | Geçmiş
 *
 * Faz 1 hooks (`useEcaRules` + 5 mutation, `useDryRunEca`) + 15 mock rule.
 * React 19 useTransition + TanStack Query v5 optimistic invalidation.
 *
 * Yasaklı renkler: bg-white / text-gray / sky / indigo / blue / teal.
 * Rounded: xl / 2xl / lg / full only.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react'
import {
  Plus,
  Play,
  Trash2,
  Power,
  Activity,
  History as HistoryIcon,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  XCircle,
} from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  useEcaRules,
  useEcaRule,
  useCreateEcaRule,
  useUpdateEcaRule,
  useDeleteEcaRule,
  useDryRunEca,
} from '@landx/data'
import type {
  EcaAction,
  EcaActionType,
  EcaCondition,
  EcaDryRunResult,
  EcaEventType,
  EcaOperator,
  EcaRule,
} from '@landx/data'

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_TYPES: EcaEventType[] = [
  'listing.created',
  'listing.updated',
  'listing.status_changed',
  'listing.price_changed',
  'listing.viewed',
  'offer.created',
  'offer.accepted',
  'offer.rejected',
  'message.sent',
  'message.read',
  'viewing.scheduled',
  'viewing.completed',
  'tkgm.queried',
  'tkgm.updated',
  'user.registered',
  'user.kyc_verified',
  'system.cron.daily',
  'system.cron.hourly',
]

const OPERATORS: EcaOperator[] = [
  'eq',
  'ne',
  'gt',
  'lt',
  'gte',
  'lte',
  'in',
  'nin',
  'contains',
  'between',
  'regex',
]

const ACTION_TYPES: EcaActionType[] = [
  'send_notification',
  'send_email',
  'send_sms',
  'create_audit',
  'update_listing_status',
  'webhook',
]

const EVENT_LABEL: Record<EcaEventType, string> = {
  'listing.created': 'İlan oluşturuldu',
  'listing.updated': 'İlan güncellendi',
  'listing.status_changed': 'İlan durum değişti',
  'listing.price_changed': 'Fiyat değişti',
  'listing.viewed': 'Görüntülendi',
  'offer.created': 'Teklif oluştu',
  'offer.accepted': 'Teklif kabul',
  'offer.rejected': 'Teklif ret',
  'message.sent': 'Mesaj gönderildi',
  'message.read': 'Mesaj okundu',
  'viewing.scheduled': 'Randevu planlandı',
  'viewing.completed': 'Randevu tamamlandı',
  'tkgm.queried': 'TKGM sorgusu',
  'tkgm.updated': 'TKGM güncellendi',
  'user.registered': 'Kullanıcı kaydoldu',
  'user.kyc_verified': 'KYC doğrulandı',
  'system.cron.daily': 'Günlük cron',
  'system.cron.hourly': 'Saatlik cron',
}

const EVENT_GROUP: Record<EcaEventType, string> = {
  'listing.created': 'listing',
  'listing.updated': 'listing',
  'listing.status_changed': 'listing',
  'listing.price_changed': 'listing',
  'listing.viewed': 'listing',
  'offer.created': 'offer',
  'offer.accepted': 'offer',
  'offer.rejected': 'offer',
  'message.sent': 'message',
  'message.read': 'message',
  'viewing.scheduled': 'viewing',
  'viewing.completed': 'viewing',
  'tkgm.queried': 'tkgm',
  'tkgm.updated': 'tkgm',
  'user.registered': 'user',
  'user.kyc_verified': 'user',
  'system.cron.daily': 'system',
  'system.cron.hourly': 'system',
}

const GROUP_TONE: Record<string, string> = {
  listing:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  offer:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  message:
    'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  viewing:
    'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  tkgm: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  user: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  system: 'border-foreground/20 bg-foreground/5 text-muted-foreground',
}

const ACTION_LABEL: Record<EcaActionType, string> = {
  send_notification: 'Bildirim',
  send_email: 'E-posta',
  send_sms: 'SMS',
  create_audit: 'Denetim kaydı',
  update_listing_status: 'İlan durumu güncelle',
  webhook: 'Webhook',
}

type TabKey = 'general' | 'conditions' | 'actions' | 'dryrun' | 'history'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'general', label: 'Genel' },
  { key: 'conditions', label: 'Koşullar' },
  { key: 'actions', label: 'Aksiyonlar' },
  { key: 'dryrun', label: 'Dry-Run' },
  { key: 'history', label: 'Geçmiş' },
]

const DEFAULT_PAYLOAD = `{
  "listing": {
    "tkgmStatus": "ipotekli",
    "tapuType": "hisseli",
    "cinsi": "Tarla",
    "priceChangePct": 22
  },
  "user": { "role": "seller", "kycLevel": "basic" }
}`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function formatAbs(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function parseValueInput(raw: string): unknown {
  // Try JSON first (true/false/null/numbers/arrays/objects/strings).
  // Fallback: bare string.
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    return JSON.parse(trimmed)
  } catch {
    return raw
  }
}

// ─── Root component ──────────────────────────────────────────────────────────

export function Rules() {
  const { data: rules = [], isPending } = useEcaRules()
  const updateMutation = useUpdateEcaRule()
  const createMutation = useCreateEcaRule()
  const deleteMutation = useDeleteEcaRule()
  const dryRunMutation = useDryRunEca()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<TabKey>('general')
  const [dryRunCount, setDryRunCount] = useState(0)
  const [, startTransition] = useTransition()

  // Default selection: ilk rule.
  useEffect(() => {
    if (!selectedId && rules.length > 0) {
      setSelectedId(rules[0].id)
    }
  }, [rules, selectedId])

  const groups = useMemo(() => {
    const set = new Set<string>()
    for (const r of rules) set.add(EVENT_GROUP[r.event])
    return ['all', ...Array.from(set).sort()]
  }, [rules])

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (filter === 'enabled' && !r.enabled) return false
      if (filter === 'disabled' && r.enabled) return false
      if (groupFilter !== 'all' && EVENT_GROUP[r.event] !== groupFilter)
        return false
      return true
    })
  }, [rules, filter, groupFilter])

  // KPI hesaplamaları.
  const kpis = useMemo(() => {
    const total = rules.length
    const active = rules.filter((r) => r.enabled).length
    // "Son 24 saat tetikleme" → lastTriggeredAt < 24h sayısı.
    const now = Date.now()
    const triggered24h = rules.filter((r) => {
      if (!r.lastTriggeredAt) return false
      const t = new Date(r.lastTriggeredAt).getTime()
      return now - t < 24 * 3600 * 1000
    }).length
    return { total, active, triggered24h, dryRun: dryRunCount }
  }, [rules, dryRunCount])

  const selected = useMemo(
    () => rules.find((r) => r.id === selectedId) ?? null,
    [rules, selectedId],
  )

  const handleSelect = useCallback((id: string) => {
    startTransition(() => {
      setSelectedId(id)
      setActiveTab('general')
    })
  }, [])

  const handleTabChange = useCallback((tab: TabKey) => {
    startTransition(() => setActiveTab(tab))
  }, [])

  const handleToggle = useCallback(
    (rule: EcaRule) => {
      startTransition(() => {
        updateMutation.mutate({
          ruleId: rule.id,
          patch: { enabled: !rule.enabled },
        })
      })
    },
    [updateMutation],
  )

  const handleCreate = useCallback(() => {
    startTransition(() => {
      createMutation.mutate(
        {
          name: 'Yeni kural',
          description: 'Açıklama girin',
          event: 'listing.created',
          conditions: [],
          actions: [],
          enabled: false,
        },
        {
          onSuccess: (created) => {
            setSelectedId(created.id)
            setActiveTab('general')
          },
        },
      )
    })
  }, [createMutation])

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm('Bu kuralı silmek istediğinize emin misiniz?'))
        return
      startTransition(() => {
        deleteMutation.mutate(id, {
          onSuccess: () => {
            if (selectedId === id) setSelectedId(null)
          },
        })
      })
    },
    [deleteMutation, selectedId],
  )

  return (
    <PageShell
      eyebrow="MOD · K04 · ECA RULES"
      title={
        <>
          ECA <em className="font-serif italic font-light">kuralları</em>
        </>
      }
      description={`${kpis.total} kural · ${kpis.active} aktif · Event ▸ Condition ▸ Action editor + dry-run simülatör.`}
      actions={
        <button
          type="button"
          onClick={handleCreate}
          disabled={createMutation.isPending}
          data-testid="rule-create"
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Yeni kural
        </button>
      }
    >
      <KpiBar kpis={kpis} />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <RuleListPane
          rules={rules}
          filtered={filteredRules}
          groups={groups}
          filter={filter}
          groupFilter={groupFilter}
          selectedId={selectedId}
          isPending={isPending}
          onFilterChange={(f) => startTransition(() => setFilter(f))}
          onGroupChange={(g) => startTransition(() => setGroupFilter(g))}
          onSelect={handleSelect}
          onToggle={handleToggle}
        />

        <section
          aria-label="Kural detayı"
          data-testid="rule-detail-pane"
          className="min-w-0 rounded-2xl border border-border bg-card"
        >
          {selected ? (
            <RuleDetailPane
              rule={selected}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onUpdate={(patch) =>
                startTransition(() => {
                  updateMutation.mutate({ ruleId: selected.id, patch })
                })
              }
              onDelete={() => handleDelete(selected.id)}
              onDryRun={(payload) => {
                setDryRunCount((c) => c + 1)
                return dryRunMutation.mutateAsync({
                  ruleId: selected.id,
                  payload,
                })
              }}
              dryRunResult={dryRunMutation.data ?? null}
              dryRunPending={dryRunMutation.isPending}
              dryRunError={
                dryRunMutation.error ? String(dryRunMutation.error) : null
              }
            />
          ) : (
            <div
              data-testid="rule-detail-empty"
              className="grid h-64 place-items-center text-sm text-muted-foreground"
            >
              {isPending ? 'Yükleniyor…' : 'Soldan bir kural seçin.'}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}

// ─── KPI Bar ─────────────────────────────────────────────────────────────────

interface KpiBarProps {
  kpis: { total: number; active: number; triggered24h: number; dryRun: number }
}

function KpiBar({ kpis }: KpiBarProps) {
  const items = [
    {
      label: 'Toplam kural',
      value: kpis.total,
      icon: Sparkles,
      tone: 'text-foreground',
    },
    {
      label: 'Aktif kural',
      value: kpis.active,
      icon: Power,
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Son 24 saat',
      value: kpis.triggered24h,
      icon: Activity,
      tone: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Dry-run (oturum)',
      value: kpis.dryRun,
      icon: Play,
      tone: 'text-fuchsia-600 dark:text-fuchsia-400',
    },
  ] as const

  return (
    <section
      className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="rules-kpi-bar"
    >
      {items.map((it) => {
        const Icon = it.icon
        return (
          <div
            key={it.label}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {it.label}
              </span>
              <Icon className={cn('h-4 w-4', it.tone)} />
            </div>
            <div className="mt-2 font-serif text-3xl font-light tabular-nums">
              {it.value}
            </div>
          </div>
        )
      })}
    </section>
  )
}

// ─── Rule List Pane (sol) ────────────────────────────────────────────────────

interface RuleListPaneProps {
  rules: EcaRule[]
  filtered: EcaRule[]
  groups: string[]
  filter: 'all' | 'enabled' | 'disabled'
  groupFilter: string
  selectedId: string | null
  isPending: boolean
  onFilterChange: (f: 'all' | 'enabled' | 'disabled') => void
  onGroupChange: (g: string) => void
  onSelect: (id: string) => void
  onToggle: (r: EcaRule) => void
}

function RuleListPane(props: RuleListPaneProps) {
  const {
    rules,
    filtered,
    groups,
    filter,
    groupFilter,
    selectedId,
    isPending,
    onFilterChange,
    onGroupChange,
    onSelect,
    onToggle,
  } = props

  const enabledCount = rules.filter((r) => r.enabled).length
  const disabledCount = rules.length - enabledCount

  return (
    <aside
      className="lg:sticky lg:top-4 lg:self-start"
      data-testid="rule-list-pane"
    >
      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            {(['all', 'enabled', 'disabled'] as const).map((k) => {
              const active = filter === k
              const label =
                k === 'all' ? 'Hepsi' : k === 'enabled' ? 'Aktif' : 'Pasif'
              const count =
                k === 'all'
                  ? rules.length
                  : k === 'enabled'
                    ? enabledCount
                    : disabledCount
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onFilterChange(k)}
                  aria-pressed={active}
                  data-testid={`rules-filter-${k}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                  <span className="font-mono text-[10px] tabular-nums opacity-70">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-2">
            <label
              htmlFor="rule-group-filter"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Event grubu
            </label>
            <select
              id="rule-group-filter"
              value={groupFilter}
              onChange={(e) => onGroupChange(e.target.value)}
              data-testid="rules-group-filter"
              className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-[12px] outline-none focus:border-foreground"
            >
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g === 'all' ? 'Tüm gruplar' : g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ul
          className="max-h-[68vh] divide-y divide-border overflow-y-auto"
          data-testid="rule-list"
        >
          {isPending ? (
            <li className="p-3">
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl bg-foreground/5"
                  />
                ))}
              </div>
            </li>
          ) : filtered.length === 0 ? (
            <li
              className="p-6 text-center text-[12px] text-muted-foreground"
              data-testid="rule-list-empty"
            >
              Bu filtrede kural yok.
            </li>
          ) : (
            filtered.map((rule) => {
              const active = selectedId === rule.id
              const group = EVENT_GROUP[rule.event]
              return (
                <li key={rule.id} data-testid="rule-row" data-rule-id={rule.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(rule.id)}
                    className={cn(
                      'flex w-full items-start gap-2 px-3 py-2.5 text-left transition',
                      active
                        ? 'bg-foreground/[0.06]'
                        : 'hover:bg-foreground/[0.03]',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium">
                          {rule.name}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                            GROUP_TONE[group],
                          )}
                        >
                          {group}
                        </span>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {rule.triggerCount}× tetik
                        </span>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={rule.enabled}
                      onChange={() => onToggle(rule)}
                      label={`${rule.name} ${rule.enabled ? 'devre dışı' : 'aktif'}`}
                      testId={`rule-toggle-${rule.id}`}
                    />
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </aside>
  )
}

// ─── Toggle switch (re-usable) ───────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: () => void
  label: string
  testId?: string
}

function ToggleSwitch({ checked, onChange, label, testId }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      data-testid={testId}
      className={cn(
        'inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition',
        checked
          ? 'justify-end border-emerald-500/40 bg-emerald-500/20'
          : 'justify-start border-border bg-foreground/[0.06]',
      )}
    >
      <span className="m-0.5 h-3.5 w-3.5 rounded-full bg-card shadow-sm" />
    </button>
  )
}

// ─── Rule Detail Pane (sağ) ──────────────────────────────────────────────────

interface RuleDetailPaneProps {
  rule: EcaRule
  activeTab: TabKey
  onTabChange: (t: TabKey) => void
  onUpdate: (patch: Partial<EcaRule>) => void
  onDelete: () => void
  onDryRun: (payload: Record<string, unknown>) => Promise<EcaDryRunResult>
  dryRunResult: EcaDryRunResult | null
  dryRunPending: boolean
  dryRunError: string | null
}

function RuleDetailPane(props: RuleDetailPaneProps) {
  const {
    rule,
    activeTab,
    onTabChange,
    onUpdate,
    onDelete,
    onDryRun,
    dryRunResult,
    dryRunPending,
    dryRunError,
  } = props

  return (
    <>
      <header className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {rule.id}
            </div>
            <h2
              data-testid="rule-detail-title"
              className="mt-0.5 font-serif text-xl font-medium tracking-tight"
            >
              {rule.name}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onDelete}
              data-testid="rule-delete"
              className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-500/15 dark:text-rose-300"
            >
              <Trash2 className="h-3 w-3" />
              Sil
            </button>
          </div>
        </div>

        <nav
          className="mt-3 flex flex-wrap gap-1"
          role="tablist"
          aria-label="Kural detay sekmeleri"
        >
          {TABS.map((t) => {
            const active = activeTab === t.key
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(t.key)}
                data-testid={`rule-tab-${t.key}`}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-[12px] font-medium transition',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            )
          })}
        </nav>
      </header>

      <div className="p-4">
        {activeTab === 'general' && (
          <GeneralTab rule={rule} onUpdate={onUpdate} />
        )}
        {activeTab === 'conditions' && (
          <ConditionsTab rule={rule} onUpdate={onUpdate} />
        )}
        {activeTab === 'actions' && (
          <ActionsTab rule={rule} onUpdate={onUpdate} />
        )}
        {activeTab === 'dryrun' && (
          <DryRunTab
            rule={rule}
            result={dryRunResult}
            pending={dryRunPending}
            error={dryRunError}
            onDryRun={onDryRun}
          />
        )}
        {activeTab === 'history' && <HistoryTab rule={rule} />}
      </div>
    </>
  )
}

// ─── Tab: Genel ──────────────────────────────────────────────────────────────

interface GeneralTabProps {
  rule: EcaRule
  onUpdate: (patch: Partial<EcaRule>) => void
}

function GeneralTab({ rule, onUpdate }: GeneralTabProps) {
  const [name, setName] = useState(rule.name)
  const [description, setDescription] = useState(rule.description)
  const [event, setEvent] = useState<EcaEventType>(rule.event)

  useEffect(() => {
    setName(rule.name)
    setDescription(rule.description)
    setEvent(rule.event)
  }, [rule.id, rule.name, rule.description, rule.event])

  const dirty =
    name !== rule.name ||
    description !== rule.description ||
    event !== rule.event

  return (
    <div className="space-y-4" data-testid="rule-tab-content-general">
      <div>
        <label
          htmlFor="rule-name"
          className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Kural adı
        </label>
        <input
          id="rule-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="rule-name-input"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </div>

      <div>
        <label
          htmlFor="rule-description"
          className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Açıklama
        </label>
        <textarea
          id="rule-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          data-testid="rule-description-input"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </div>

      <div>
        <label
          htmlFor="rule-event"
          className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Olay (event)
        </label>
        <select
          id="rule-event"
          value={event}
          onChange={(e) => setEvent(e.target.value as EcaEventType)}
          data-testid="rule-event-select"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        >
          {EVENT_TYPES.map((evt) => (
            <option key={evt} value={evt}>
              {EVENT_LABEL[evt]} — {evt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
        <ToggleSwitch
          checked={rule.enabled}
          onChange={() => onUpdate({ enabled: !rule.enabled })}
          label={rule.enabled ? 'Kuralı devre dışı bırak' : 'Kuralı aktifleştir'}
          testId="rule-general-enabled-toggle"
        />
        <div>
          <div className="text-[13px] font-medium">
            {rule.enabled ? 'Aktif' : 'Pasif'}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {rule.enabled
              ? 'Bu kural ilgili olay tetiklendiğinde değerlendirilir.'
              : 'Bu kural değerlendirilmez (sadece dry-run çalışır).'}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-[12px]">
        <Field label="Oluşturma" value={formatAbs(rule.createdAt)} mono />
        <Field label="Son güncelleme" value={formatAbs(rule.updatedAt)} mono />
        <Field
          label="Tetikleme sayısı"
          value={String(rule.triggerCount)}
          mono
        />
        <Field label="Son tetik" value={formatAbs(rule.lastTriggeredAt)} mono />
      </dl>

      {dirty && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-300">
          <span className="flex-1">Kaydedilmemiş değişiklikler var.</span>
          <button
            type="button"
            onClick={() => {
              setName(rule.name)
              setDescription(rule.description)
              setEvent(rule.event)
            }}
            className="rounded-lg px-2 py-1 hover:bg-foreground/5"
          >
            Geri al
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ name, description, event })}
            data-testid="rule-general-save"
            className="rounded-lg bg-foreground px-2 py-1 text-background hover:opacity-90"
          >
            Kaydet
          </button>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-0.5 break-words text-foreground',
          mono && 'font-mono tabular-nums text-[12px]',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

// ─── Tab: Koşullar ───────────────────────────────────────────────────────────

interface ConditionsTabProps {
  rule: EcaRule
  onUpdate: (patch: Partial<EcaRule>) => void
}

function ConditionsTab({ rule, onUpdate }: ConditionsTabProps) {
  const [drafts, setDrafts] = useState<EcaCondition[]>(rule.conditions)

  useEffect(() => {
    setDrafts(rule.conditions)
  }, [rule.id, rule.conditions])

  const dirty = useMemo(
    () => safeStringify(drafts) !== safeStringify(rule.conditions),
    [drafts, rule.conditions],
  )

  const updateRow = (id: string, patch: Partial<EcaCondition>) => {
    setDrafts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    )
  }

  const removeRow = (id: string) => {
    setDrafts((prev) => prev.filter((c) => c.id !== id))
  }

  const addRow = () => {
    setDrafts((prev) => [
      ...prev,
      { id: genId('cond'), field: '', operator: 'eq', value: '' },
    ])
  }

  return (
    <div className="space-y-3" data-testid="rule-tab-content-conditions">
      <div className="flex items-start justify-between">
        <p className="text-[12px] text-muted-foreground">
          AND mantığı ile tüm koşullar eşleşmeli. Boş listede kural her olayda
          tetiklenir.
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {drafts.length} koşul
        </span>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/40 p-6 text-center text-[12px] text-muted-foreground">
          Koşul yok. "Koşul ekle" ile başlayın.
        </div>
      ) : (
        <ul className="space-y-2">
          {drafts.map((cond) => (
            <ConditionRow
              key={cond.id}
              cond={cond}
              onChange={(patch) => updateRow(cond.id, patch)}
              onRemove={() => removeRow(cond.id)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={addRow}
        data-testid="rule-condition-add"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
      >
        <Plus className="h-3 w-3" />
        Koşul ekle
      </button>

      {dirty && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-300">
          <span className="flex-1">Kaydedilmemiş değişiklikler.</span>
          <button
            type="button"
            onClick={() => setDrafts(rule.conditions)}
            className="rounded-lg px-2 py-1 hover:bg-foreground/5"
          >
            Geri al
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ conditions: drafts })}
            data-testid="rule-conditions-save"
            className="rounded-lg bg-foreground px-2 py-1 text-background hover:opacity-90"
          >
            Kaydet
          </button>
        </div>
      )}
    </div>
  )
}

interface ConditionRowProps {
  cond: EcaCondition
  onChange: (patch: Partial<EcaCondition>) => void
  onRemove: () => void
}

function ConditionRow({ cond, onChange, onRemove }: ConditionRowProps) {
  const [valueText, setValueText] = useState(() =>
    typeof cond.value === 'string' ? cond.value : safeStringify(cond.value),
  )

  return (
    <li
      data-testid="rule-condition-row"
      className="grid gap-2 rounded-xl border border-border bg-background p-2.5 sm:grid-cols-[1fr_120px_1fr_auto]"
    >
      <input
        type="text"
        placeholder="field (örn: listing.tkgmStatus)"
        value={cond.field}
        onChange={(e) => onChange({ field: e.target.value })}
        className="rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[12px] outline-none focus:border-foreground"
        data-testid="rule-condition-field"
      />
      <select
        value={cond.operator}
        onChange={(e) =>
          onChange({ operator: e.target.value as EcaOperator })
        }
        data-testid="rule-condition-operator"
        className="rounded-lg border border-border bg-card px-2 py-1.5 font-mono text-[12px] outline-none focus:border-foreground"
      >
        {OPERATORS.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder='value (JSON: "ipotekli", 22, ["a","b"])'
        value={valueText}
        onChange={(e) => {
          setValueText(e.target.value)
          onChange({ value: parseValueInput(e.target.value) })
        }}
        className="rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[12px] outline-none focus:border-foreground"
        data-testid="rule-condition-value"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Koşulu sil"
        data-testid="rule-condition-remove"
        className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-2 py-1.5 text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  )
}

// ─── Tab: Aksiyonlar ─────────────────────────────────────────────────────────

interface ActionsTabProps {
  rule: EcaRule
  onUpdate: (patch: Partial<EcaRule>) => void
}

function ActionsTab({ rule, onUpdate }: ActionsTabProps) {
  const [drafts, setDrafts] = useState<EcaAction[]>(rule.actions)

  useEffect(() => {
    setDrafts(rule.actions)
  }, [rule.id, rule.actions])

  const dirty = useMemo(
    () => safeStringify(drafts) !== safeStringify(rule.actions),
    [drafts, rule.actions],
  )

  const updateRow = (id: string, patch: Partial<EcaAction>) => {
    setDrafts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    )
  }

  const removeRow = (id: string) => {
    setDrafts((prev) => prev.filter((a) => a.id !== id))
  }

  const addRow = () => {
    setDrafts((prev) => [
      ...prev,
      { id: genId('act'), type: 'send_notification', params: {} },
    ])
  }

  return (
    <div className="space-y-3" data-testid="rule-tab-content-actions">
      <div className="flex items-start justify-between">
        <p className="text-[12px] text-muted-foreground">
          Koşullar eşleştiğinde aşağıdaki aksiyonlar sırayla çalışır.
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {drafts.length} aksiyon
        </span>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/40 p-6 text-center text-[12px] text-muted-foreground">
          Aksiyon yok. "Aksiyon ekle" ile başlayın.
        </div>
      ) : (
        <ul className="space-y-2">
          {drafts.map((act) => (
            <ActionRow
              key={act.id}
              action={act}
              onChange={(patch) => updateRow(act.id, patch)}
              onRemove={() => removeRow(act.id)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={addRow}
        data-testid="rule-action-add"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
      >
        <Plus className="h-3 w-3" />
        Aksiyon ekle
      </button>

      {dirty && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-300">
          <span className="flex-1">Kaydedilmemiş değişiklikler.</span>
          <button
            type="button"
            onClick={() => setDrafts(rule.actions)}
            className="rounded-lg px-2 py-1 hover:bg-foreground/5"
          >
            Geri al
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ actions: drafts })}
            data-testid="rule-actions-save"
            className="rounded-lg bg-foreground px-2 py-1 text-background hover:opacity-90"
          >
            Kaydet
          </button>
        </div>
      )}
    </div>
  )
}

interface ActionRowProps {
  action: EcaAction
  onChange: (patch: Partial<EcaAction>) => void
  onRemove: () => void
}

function ActionRow({ action, onChange, onRemove }: ActionRowProps) {
  const [paramsText, setParamsText] = useState(() =>
    JSON.stringify(action.params, null, 2),
  )
  const [parseError, setParseError] = useState<string | null>(null)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setParamsText(JSON.stringify(action.params, null, 2))
    setParseError(null)
  }, [action.id])

  const commitParams = (text: string) => {
    setParamsText(text)
    if (!text.trim()) {
      onChange({ params: {} })
      setParseError(null)
      return
    }
    try {
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        onChange({ params: parsed as Record<string, unknown> })
        setParseError(null)
      } else {
        setParseError('Geçerli bir JSON nesne girin.')
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'JSON parse hatası')
    }
  }

  return (
    <li
      data-testid="rule-action-row"
      className="rounded-xl border border-border bg-background p-2.5"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Kapat' : 'Aç'}
          className="rounded-lg p-1 text-muted-foreground hover:bg-foreground/5"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
        <select
          value={action.type}
          onChange={(e) =>
            onChange({ type: e.target.value as EcaActionType })
          }
          data-testid="rule-action-type"
          className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 font-mono text-[12px] outline-none focus:border-foreground"
        >
          {ACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTION_LABEL[t]} — {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Aksiyonu sil"
          data-testid="rule-action-remove"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-2 py-1.5 text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="mt-2">
          <label
            htmlFor={`act-params-${action.id}`}
            className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            Parametreler (JSON)
          </label>
          <textarea
            id={`act-params-${action.id}`}
            value={paramsText}
            onChange={(e) => commitParams(e.target.value)}
            rows={4}
            data-testid="rule-action-params"
            className={cn(
              'w-full rounded-lg border bg-card px-2.5 py-1.5 font-mono text-[11px] leading-relaxed outline-none',
              parseError
                ? 'border-rose-500/40 focus:border-rose-500'
                : 'border-border focus:border-foreground',
            )}
          />
          {parseError && (
            <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
              {parseError}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

// ─── Tab: Dry-Run ────────────────────────────────────────────────────────────

interface DryRunTabProps {
  rule: EcaRule
  result: EcaDryRunResult | null
  pending: boolean
  error: string | null
  onDryRun: (payload: Record<string, unknown>) => Promise<EcaDryRunResult>
}

function DryRunTab({ rule, result, pending, error, onDryRun }: DryRunTabProps) {
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD)
  const [parseError, setParseError] = useState<string | null>(null)
  const [localResult, setLocalResult] = useState<EcaDryRunResult | null>(null)

  useEffect(() => {
    setLocalResult(null)
  }, [rule.id])

  const run = async () => {
    let parsed: Record<string, unknown>
    try {
      const v = JSON.parse(payload)
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        parsed = v as Record<string, unknown>
      } else {
        setParseError('Payload bir JSON nesne olmalı.')
        return
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'JSON parse hatası')
      return
    }
    setParseError(null)
    try {
      const r = await onDryRun(parsed)
      setLocalResult(r)
    } catch {
      // error mutation üzerinden geliyor — parent yansıtır.
    }
  }

  const shown = localResult ?? result

  return (
    <div className="space-y-3" data-testid="rule-tab-content-dryrun">
      <div>
        <label
          htmlFor="rule-dryrun-payload"
          className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Test payload (JSON)
        </label>
        <textarea
          id="rule-dryrun-payload"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={8}
          data-testid="rule-dryrun-payload-input"
          className={cn(
            'w-full rounded-xl border bg-background px-3 py-2 font-mono text-[12px] leading-relaxed outline-none',
            parseError
              ? 'border-rose-500/40 focus:border-rose-500'
              : 'border-border focus:border-foreground',
          )}
        />
        {parseError && (
          <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
            {parseError}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={run}
        disabled={pending}
        data-testid="rule-dryrun-execute"
        className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
      >
        <Play className="h-3 w-3" />
        {pending ? 'Çalıştırılıyor…' : 'Çalıştır'}
      </button>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-300">
          Hata: {error}
        </div>
      )}

      {shown && (
        <div
          data-testid="rule-dryrun-result"
          className={cn(
            'rounded-2xl border p-3',
            shown.matched
              ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
              : 'border-amber-500/30 bg-amber-500/[0.06]',
          )}
        >
          <div className="flex items-center gap-2">
            {shown.matched ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
            <strong className="text-[13px]">
              {shown.matched
                ? `Eşleşti — ${shown.emittedActions.length} aksiyon tetiklendi`
                : 'Eşleşmedi'}
            </strong>
          </div>

          {shown.emittedActions.length > 0 && (
            <ul
              className="mt-2 flex flex-wrap gap-1.5"
              data-testid="rule-dryrun-actions"
            >
              {shown.emittedActions.map((a) => (
                <li
                  key={a.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[11px]"
                >
                  {ACTION_LABEL[a.type]}
                </li>
              ))}
            </ul>
          )}

          {shown.evaluationLog.length > 0 && (
            <details className="mt-2 text-[12px]" open>
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Değerlendirme logu
              </summary>
              <ul className="mt-1.5 space-y-1">
                {shown.evaluationLog.map((entry) => (
                  <li
                    key={entry.conditionId}
                    className="flex items-start gap-2 font-mono text-[11px]"
                  >
                    {entry.result ? (
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                    <span className="text-muted-foreground">
                      {entry.conditionId}
                    </span>
                    <span className="break-all">{entry.reason}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Geçmiş ─────────────────────────────────────────────────────────────

function HistoryTab({ rule }: { rule: EcaRule }) {
  // Mock geçmiş: triggerCount + lastTriggeredAt'tan sentetik N event üret.
  // Gerçek event log Faz 3'te `useEcaRuleHistory(id)` ile bağlanacak.
  const { isPending } = useEcaRule(rule.id)

  const events = useMemo(() => {
    if (!rule.lastTriggeredAt || rule.triggerCount === 0) return []
    const last = new Date(rule.lastTriggeredAt).getTime()
    const n = Math.min(10, rule.triggerCount)
    return Array.from({ length: n }, (_, i) => {
      const offset = i * (2 + (i % 5)) * 3600 * 1000
      const matched = i % 4 !== 0
      return {
        id: `${rule.id}-h${i}`,
        at: new Date(last - offset).toISOString(),
        matched,
      }
    })
  }, [rule])

  return (
    <div className="space-y-3" data-testid="rule-tab-content-history">
      <div className="flex items-start justify-between">
        <p className="text-[12px] text-muted-foreground">
          Son {events.length} tetik (mock). Toplam: {rule.triggerCount}
        </p>
        <HistoryIcon className="h-4 w-4 text-muted-foreground" />
      </div>

      {isPending ? (
        <div className="space-y-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-xl bg-foreground/5"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/40 p-6 text-center text-[12px] text-muted-foreground">
          Henüz tetiklenme yok.
        </div>
      ) : (
        <ul className="space-y-1.5" data-testid="rule-history-list">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[12px]"
            >
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                  ev.matched
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                )}
              >
                {ev.matched ? 'matched' : 'no-match'}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {formatAbs(ev.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
