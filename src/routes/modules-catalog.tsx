// Wave F36.C — Module Catalog UI.
//
// 37 modül, 6 layer (L0 Kernel → L5 Operations) data-driven liste.
// Faz 1 (b8ed1d6) `@landx/data` altyapısını tüketir:
//   - useModulesCatalog() / useModuleDetail(id)
//   - MODULES_CATALOG / MODULE_LAYERS sabitleri
//   - CatalogModule / ModuleLayer / ModuleStatus / ModulePriority tipleri
//
// landxpanelpages-main/src/features/admin/ModulesPage.tsx referansından
// adapte — Liquid Glass tema (PageShell, font-serif italic title, rounded-2xl
// card'lar, mono eyebrow, muted-foreground hint'ler).
//
// Filter setter'lar useTransition ile sarılı (INP < 200ms — listede 37 modül
// yeniden render olabilir). Arama input'u doğrudan setQ — input'larda
// transition kullanılmaz (CLAUDE.md).

import { useDeferredValue, useMemo, useState, useTransition } from 'react'
import { Search, Sparkles, Cpu, ExternalLink, X, Link as LinkIcon } from '@landx/icons'
import { Link } from 'react-router-dom'
import { PageShell, cn } from '@landx/ui'
import {
  MODULE_LAYERS,
  useModuleDetail,
  useModulesCatalog,
  type CatalogModule,
  type ModuleLayer,
  type ModulePriority,
  type ModuleStatus,
} from '@landx/data'

type LayerFilter = 'all' | ModuleLayer
type StatusFilter = 'all' | ModuleStatus
type PriorityFilter = 'all' | ModulePriority

const STATUS_LABEL: Record<ModuleStatus, string> = {
  full: 'Tam',
  partial: 'Kısmi',
  planned: 'Planlı',
}

const STATUS_GLYPH: Record<ModuleStatus, string> = {
  full: '●',
  partial: '◐',
  planned: '○',
}

const PRIORITY_LABEL: Record<ModulePriority, string> = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
}

export function ModulesCatalog() {
  const { data: modules = [], isPending } = useModulesCatalog()
  const [layer, setLayer] = useState<LayerFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [priority, setPriority] = useState<PriorityFilter>('all')
  const [rawQuery, setRawQuery] = useState('')
  const query = useDeferredValue(rawQuery)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const stats = useMemo(() => {
    return {
      total: modules.length,
      full: modules.filter((m) => m.implStatus === 'full').length,
      partial: modules.filter((m) => m.implStatus === 'partial').length,
      planned: modules.filter((m) => m.implStatus === 'planned').length,
      ai: modules.filter((m) => m.isAi).length,
      mcp: modules.filter((m) => m.isMcp).length,
    }
  }, [modules])

  const layerCounts = useMemo(() => {
    const map: Record<string, number> = { all: modules.length }
    for (const m of modules) {
      map[m.layer] = (map[m.layer] ?? 0) + 1
    }
    return map
  }, [modules])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR')
    return modules.filter((m) => {
      if (layer !== 'all' && m.layer !== layer) return false
      if (status !== 'all' && m.implStatus !== status) return false
      if (priority !== 'all' && m.priority !== priority) return false
      if (needle) {
        const hay = `${m.id} ${m.name} ${m.description} ${m.squad}`.toLocaleLowerCase(
          'tr-TR',
        )
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [modules, layer, status, priority, query])

  return (
    <PageShell
      eyebrow="MOD · CATALOG"
      title={
        <>
          Module <em className="font-serif italic font-light">kataloğu</em>
        </>
      }
      description="37 modül, 6 katman (L0 Kernel → L5 Operations) — durum / öncelik / squad."
    >
      <StatsBar stats={stats} isPending={isPending} />

      <FilterBar
        layer={layer}
        status={status}
        priority={priority}
        rawQuery={rawQuery}
        layerCounts={layerCounts}
        stats={stats}
        onLayerChange={(next) => startTransition(() => setLayer(next))}
        onStatusChange={(next) => startTransition(() => setStatus(next))}
        onPriorityChange={(next) => startTransition(() => setPriority(next))}
        onQueryChange={setRawQuery}
      />

      <section
        data-testid="modules-catalog-grid"
        className="mt-5"
      >
        {isPending ? (
          <GridSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            onReset={() => {
              startTransition(() => {
                setLayer('all')
                setStatus('all')
                setPriority('all')
              })
              setRawQuery('')
            }}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m) => (
              <ModuleCard
                key={m.id}
                module={m}
                onSelect={() => setSelectedId(m.id)}
                isActive={m.id === selectedId}
              />
            ))}
          </ul>
        )}
      </section>

      {selectedId && (
        <ModuleDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onSelectModule={(id) => setSelectedId(id)}
        />
      )}
    </PageShell>
  )
}

export default ModulesCatalog

// ─── Stats bar ────────────────────────────────────────────────────────────

interface StatsBarProps {
  stats: {
    total: number
    full: number
    partial: number
    planned: number
    ai: number
    mcp: number
  }
  isPending: boolean
}

function StatsBar({ stats, isPending }: StatsBarProps) {
  return (
    <section
      data-testid="modules-catalog-stats"
      className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
    >
      <StatCard
        label="Toplam modül"
        value={isPending ? '…' : String(stats.total)}
        hint="6 katman"
      />
      <StatCard
        label="Tam"
        value={isPending ? '…' : String(stats.full)}
        glyph="●"
        tone="positive"
      />
      <StatCard
        label="Kısmi"
        value={isPending ? '…' : String(stats.partial)}
        glyph="◐"
        tone="warn"
      />
      <StatCard
        label="Planlı"
        value={isPending ? '…' : String(stats.planned)}
        glyph="○"
        tone="muted"
      />
      <StatCard
        label="AI / MCP"
        value={isPending ? '…' : `${stats.ai} / ${stats.mcp}`}
        glyph="✦"
      />
    </section>
  )
}

interface StatCardProps {
  label: string
  value: string
  hint?: string
  glyph?: string
  tone?: 'positive' | 'warn' | 'muted'
}

function StatCard({ label, value, hint, glyph, tone }: StatCardProps) {
  const toneCls =
    tone === 'positive'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'warn'
        ? 'text-amber-700 dark:text-amber-300'
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-foreground'
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {glyph && <span className={cn('text-base leading-none', toneCls)}>{glyph}</span>}
      </div>
      <div className="mt-2 font-serif text-2xl font-light tabular-nums">{value}</div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      )}
    </div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────

interface FilterBarProps {
  layer: LayerFilter
  status: StatusFilter
  priority: PriorityFilter
  rawQuery: string
  layerCounts: Record<string, number>
  stats: { full: number; partial: number; planned: number }
  onLayerChange: (next: LayerFilter) => void
  onStatusChange: (next: StatusFilter) => void
  onPriorityChange: (next: PriorityFilter) => void
  onQueryChange: (next: string) => void
}

function FilterBar({
  layer,
  status,
  priority,
  rawQuery,
  layerCounts,
  stats,
  onLayerChange,
  onStatusChange,
  onPriorityChange,
  onQueryChange,
}: FilterBarProps) {
  return (
    <section
      data-testid="modules-catalog-filter"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <FilterLabel>Katman</FilterLabel>
        <FilterChip
          active={layer === 'all'}
          onClick={() => onLayerChange('all')}
          testId="modules-layer-all"
        >
          Tümü
          <CountBadge value={layerCounts.all ?? 0} />
        </FilterChip>
        {MODULE_LAYERS.map((l) => (
          <FilterChip
            key={l.layer}
            active={layer === l.layer}
            onClick={() => onLayerChange(l.layer)}
            testId={`modules-layer-${l.layer}`}
          >
            <span className="font-mono">{l.layer}</span>
            <span className="hidden sm:inline">· {l.layerName}</span>
            <CountBadge value={layerCounts[l.layer] ?? 0} />
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterLabel>Durum</FilterLabel>
        <FilterChip
          active={status === 'all'}
          onClick={() => onStatusChange('all')}
          testId="modules-status-all"
        >
          Tümü
        </FilterChip>
        {(['full', 'partial', 'planned'] as const).map((s) => (
          <FilterChip
            key={s}
            active={status === s}
            onClick={() => onStatusChange(s)}
            testId={`modules-status-${s}`}
          >
            <span aria-hidden>{STATUS_GLYPH[s]}</span>
            {STATUS_LABEL[s]}
            <CountBadge value={stats[s]} />
          </FilterChip>
        ))}

        <FilterLabel className="ml-2">Öncelik</FilterLabel>
        <FilterChip
          active={priority === 'all'}
          onClick={() => onPriorityChange('all')}
          testId="modules-priority-all"
        >
          Tümü
        </FilterChip>
        {(['P0', 'P1', 'P2'] as const).map((p) => (
          <FilterChip
            key={p}
            active={priority === p}
            onClick={() => onPriorityChange(p)}
            testId={`modules-priority-${p}`}
          >
            <span className="font-mono">{PRIORITY_LABEL[p]}</span>
          </FilterChip>
        ))}

        <div className="relative ml-auto w-full max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={rawQuery}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Modül ara (id, ad, açıklama)"
            aria-label="Modül ara"
            data-testid="modules-search"
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-foreground"
          />
        </div>
      </div>
    </section>
  )
}

function FilterLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}

function FilterChip({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  testId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function CountBadge({ value }: { value: number }) {
  return (
    <span className="font-mono text-[10px] tabular-nums opacity-70">{value}</span>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────

interface ModuleCardProps {
  module: CatalogModule
  onSelect: () => void
  isActive: boolean
}

function ModuleCard({ module: m, onSelect, isActive }: ModuleCardProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        data-testid={`module-card-${m.id}`}
        aria-pressed={isActive}
        className={cn(
          'flex h-full w-full flex-col rounded-2xl border bg-card p-4 text-left transition',
          isActive
            ? 'border-foreground shadow-sm'
            : 'border-border hover:border-foreground/40',
        )}
      >
        <header className="flex items-center justify-between gap-2">
          <code className="rounded-md bg-foreground/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {m.id} · {m.layer}
          </code>
          <div className="flex items-center gap-1.5">
            <StatusGlyph status={m.implStatus} />
            {m.isAi && (
              <span
                title="AI özellikli"
                className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300"
              >
                <Sparkles aria-hidden className="h-2.5 w-2.5" />
                AI
              </span>
            )}
            {m.isMcp && (
              <span
                title="MCP server"
                className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-medium text-fuchsia-700 dark:text-fuchsia-300"
              >
                <Cpu aria-hidden className="h-2.5 w-2.5" />
                MCP
              </span>
            )}
          </div>
        </header>

        <h3 className="mt-2 font-serif text-base font-medium leading-snug text-foreground">
          {m.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">
          {m.description}
        </p>

        <dl className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <dt className="sr-only">Faz</dt>
          <dd className="inline-flex items-center gap-1">
            <span className="font-mono uppercase tracking-[0.12em]">Faz</span>
            <span className="font-mono font-medium text-foreground">{m.faz}</span>
          </dd>
          <dt className="sr-only">Öncelik</dt>
          <dd>
            <PriorityBadge priority={m.priority} />
          </dd>
          <dt className="sr-only">Squad</dt>
          <dd className="text-muted-foreground/90">{m.squad}</dd>
        </dl>

        <footer className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <StatusChip status={m.implStatus} />
          {m.uiRoute ? (
            <span className="inline-flex items-center gap-1 font-mono">
              <LinkIcon aria-hidden className="h-2.5 w-2.5" />
              {m.uiRoute}
            </span>
          ) : (
            <span className="font-mono text-muted-foreground/60">— uiRoute yok</span>
          )}
        </footer>
      </button>
    </li>
  )
}

function StatusGlyph({ status }: { status: ModuleStatus }) {
  const cls =
    status === 'full'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : status === 'partial'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
        : 'bg-foreground/5 text-muted-foreground'
  return (
    <span
      title={`Durum: ${STATUS_LABEL[status]}`}
      aria-label={`Durum: ${STATUS_LABEL[status]}`}
      className={cn(
        'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
        cls,
      )}
    >
      {STATUS_GLYPH[status]}
    </span>
  )
}

function StatusChip({ status }: { status: ModuleStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]',
        status === 'full'
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : status === 'partial'
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
            : 'bg-foreground/5 text-muted-foreground',
      )}
    >
      <span aria-hidden>{STATUS_GLYPH[status]}</span>
      {STATUS_LABEL[status]}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: ModulePriority }) {
  const cls =
    priority === 'P0'
      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
      : priority === 'P1'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'bg-foreground/5 text-muted-foreground'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium',
        cls,
      )}
    >
      {priority}
    </span>
  )
}

function GridSkeleton() {
  return (
    <ul
      data-testid="modules-catalog-skeleton"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="h-44 animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </ul>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div
      data-testid="modules-catalog-empty"
      className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center"
    >
      <p className="text-sm text-muted-foreground">
        Filtreyle eşleşen modül bulunamadı.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 inline-flex items-center rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/5"
      >
        Filtreleri sıfırla
      </button>
    </div>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────

interface ModuleDrawerProps {
  id: string
  onClose: () => void
  onSelectModule: (id: string) => void
}

function ModuleDrawer({ id, onClose, onSelectModule }: ModuleDrawerProps) {
  const { data: module, isPending } = useModuleDetail(id)

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        data-testid="module-drawer"
        className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={module ? module.name : 'Modül detayı'}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {isPending ? 'Yükleniyor…' : module ? `${module.id} · ${module.layer} · ${module.layerName}` : '—'}
            </div>
            <h2 className="mt-1 font-serif text-lg font-medium leading-snug">
              {isPending ? '…' : (module?.name ?? 'Bulunamadı')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Drawer'ı kapat"
            data-testid="module-drawer-close"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 text-sm">
          {isPending ? (
            <DrawerSkeleton />
          ) : !module ? (
            <p className="text-muted-foreground">Modül bulunamadı.</p>
          ) : (
            <ModuleDrawerBody module={module} onSelectModule={onSelectModule} />
          )}
        </div>
      </aside>
    </>
  )
}

function DrawerSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-3/4 animate-pulse rounded bg-foreground/10" />
      <div className="h-3 w-full animate-pulse rounded bg-foreground/10" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-foreground/10" />
      <div className="mt-4 h-20 animate-pulse rounded-xl bg-foreground/10" />
    </div>
  )
}

function ModuleDrawerBody({
  module: m,
  onSelectModule,
}: {
  module: CatalogModule
  onSelectModule: (id: string) => void
}) {
  return (
    <>
      <p className="text-[13px] leading-relaxed text-foreground/90">
        {m.description}
      </p>

      <DrawerSection title="Meta">
        <dl className="grid grid-cols-2 gap-2.5 text-[12px]">
          <Field label="Faz" value={`Faz ${m.faz}`} />
          <Field
            label="Öncelik"
            value={
              <span className="inline-flex items-center gap-1">
                <PriorityBadge priority={m.priority} /> {m.priority}
              </span>
            }
          />
          <Field label="Squad" value={m.squad} />
          <Field
            label="Durum"
            value={
              <span className="inline-flex items-center gap-1.5">
                <StatusChip status={m.implStatus} />
              </span>
            }
          />
          <Field
            label="AI"
            value={m.isAi ? 'Evet' : 'Hayır'}
          />
          <Field
            label="MCP"
            value={m.isMcp ? 'Evet' : 'Hayır'}
          />
        </dl>
      </DrawerSection>

      <DrawerSection title="Yetenekler">
        {m.capabilities.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">— Tanımlı değil.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {m.capabilities.map((cap) => (
              <li
                key={cap}
                className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11.5px] text-foreground/90"
              >
                {cap}
              </li>
            ))}
          </ul>
        )}
      </DrawerSection>

      <DrawerSection title="KPI">
        <p className="text-[12.5px] text-foreground/90">{m.kpi}</p>
      </DrawerSection>

      <DrawerSection title="UI Route">
        {m.uiRoute ? (
          <Link
            to={m.uiRoute}
            data-testid="module-drawer-route"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 font-mono text-[12px] text-foreground hover:bg-foreground/5"
          >
            <ExternalLink aria-hidden className="h-3 w-3" />
            {m.uiRoute}
          </Link>
        ) : (
          <p className="text-[12px] text-muted-foreground">— uiRoute tanımlı değil.</p>
        )}
      </DrawerSection>

      <DrawerSection title="Bağımlılıklar">
        {m.dependencies.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">— Bağımlılık yok.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {m.dependencies.map((depId) => (
              <li key={depId}>
                <button
                  type="button"
                  onClick={() => onSelectModule(depId)}
                  data-testid={`module-drawer-dep-${depId}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[11.5px] text-foreground hover:bg-foreground/5"
                >
                  <LinkIcon aria-hidden className="h-2.5 w-2.5" />
                  {depId}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DrawerSection>
    </>
  )
}

function DrawerSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-foreground/90">{value}</dd>
    </div>
  )
}
