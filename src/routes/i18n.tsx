// Wave F26.B — /i18n string catalog editor.
// 4-up KPI row + namespace dropdown + search + missing-translation chip filter
// + inline-edit TR/EN table backed by the F26.0 i18n-catalog lib.

import { useCallback, useMemo, useState } from 'react'
import { Search } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'

import CatalogTable from '@/components/i18n/CatalogTable'
import MissingFilter, {
  type MissingFilterValue,
} from '@/components/i18n/MissingFilter'
import JsonExportButton from '@/components/i18n/JsonExportButton'

import {
  findMissingEnglish,
  findMissingTurkish,
  getCatalogEntries,
  getNamespaces,
  resetCatalogString,
  updateCatalogString,
  type LocalizedString,
} from '@/lib/i18n-catalog'

export function I18nRoute() {
  const [namespace, setNamespace] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [missing, setMissing] = useState<MissingFilterValue>('all')
  const [tick, setTick] = useState(0)

  const entries: LocalizedString[] = useMemo(() => {
    void tick // re-derive after every mutation
    return getCatalogEntries()
  }, [tick])

  const namespaces = useMemo(() => {
    void tick
    return getNamespaces()
  }, [tick])

  const missingEnCount = useMemo(() => {
    void tick
    return findMissingEnglish().length
  }, [tick])

  const missingTrCount = useMemo(() => {
    void tick
    return findMissingTurkish().length
  }, [tick])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return entries.filter((row) => {
      if (namespace !== 'all' && row.namespace !== namespace) return false
      if (missing === 'missing-en' && row.en.trim().length > 0) return false
      if (missing === 'missing-tr' && row.tr.trim().length > 0) return false
      if (needle) {
        const hay = `${row.key} ${row.tr} ${row.en}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [entries, namespace, missing, query])

  const handleUpdate = useCallback(
    (key: string, patch: { tr?: string; en?: string }) => {
      updateCatalogString({ key, ...patch })
      setTick((n) => n + 1)
    },
    [],
  )

  const handleReset = useCallback((key: string) => {
    resetCatalogString(key)
    setTick((n) => n + 1)
  }, [])

  return (
    <PageShell
      eyebrow="OPS · I18N"
      title={
        <>
          Çeviri{' '}
          <em className="font-serif italic font-light text-muted-foreground">
            kataloğu
          </em>
        </>
      }
      description={`${entries.length} string · ${namespaces.length} namespace · ${missingEnCount} eksik EN · ${missingTrCount} eksik TR.`}
      actions={<JsonExportButton />}
    >
      <section
        className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4"
        data-testid="i18n-kpi-row"
      >
        <Stat
          label="Toplam string"
          value={String(entries.length)}
          hint="seed katalog"
          testId="i18n-kpi-total"
        />
        <Stat
          label="Namespace"
          value={String(namespaces.length)}
          hint="benzersiz grup"
          testId="i18n-kpi-namespaces"
        />
        <Stat
          label="Eksik EN"
          value={String(missingEnCount)}
          hint="İngilizce boş"
          tone={missingEnCount > 0 ? 'warn' : undefined}
          testId="i18n-kpi-missing-en"
        />
        <Stat
          label="Eksik TR"
          value={String(missingTrCount)}
          hint="Türkçe boş"
          tone={missingTrCount > 0 ? 'warn' : undefined}
          testId="i18n-kpi-missing-tr"
        />
      </section>

      <section
        className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5"
        data-testid="i18n-filter-bar"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Namespace
        </span>
        <select
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          className="rounded-lg border border-border bg-background/40 px-2.5 py-1 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          data-testid="i18n-namespace-filter"
        >
          <option value="all">Hepsi</option>
          {namespaces.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>

        <div className="ml-1 inline-flex items-center gap-1.5">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Key veya çeviri ara…"
            className="w-56 rounded-lg border border-border bg-background/40 px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
            data-testid="i18n-search"
          />
        </div>

        <div className="ml-auto">
          <MissingFilter
            value={missing}
            onChange={setMissing}
            missingEnCount={missingEnCount}
            missingTrCount={missingTrCount}
          />
        </div>
      </section>

      <h2 className="mb-3 font-serif text-base font-light tracking-tight">
        String kataloğu ({filtered.length} / {entries.length})
      </h2>
      <CatalogTable
        rows={filtered}
        onUpdate={handleUpdate}
        onReset={handleReset}
      />
    </PageShell>
  )
}

function Stat({
  label,
  value,
  hint,
  tone,
  testId,
}: {
  label: string
  value: string
  hint: string
  tone?: 'warn'
  testId?: string
}) {
  return (
    <article
      className="rounded-2xl border border-border bg-card p-4"
      data-testid={testId}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 font-serif text-2xl font-light tabular-nums',
          tone === 'warn' && 'text-rose-600',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
    </article>
  )
}

export default I18nRoute
