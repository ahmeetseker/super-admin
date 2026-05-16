/**
 * /api-explorer — Wave F35 / Faz 2.
 *
 * Auto REST API live tester. Sol sidebar (300px) endpoint listesi (group
 * accordion), sağ pane seçili endpoint detay + try-it formu. Mock response
 * `useTryAdminEndpoint` mutation üzerinden döner.
 */
import { useMemo, useState, useTransition } from 'react'
import { ChevronRight, Send, Lock, Unlock, Activity } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  useAdminApiEndpoints,
  useTryAdminEndpoint,
  type AdminApiEndpoint,
  type AdminApiMethod,
  type TryAdminEndpointResult,
} from '@landx/data'

const METHOD_TONE: Record<AdminApiMethod, string> = {
  GET: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  POST: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
  PUT: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  PATCH: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
  DELETE: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
}

function MethodBadge({ method }: { method: AdminApiMethod }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
        METHOD_TONE[method],
      )}
    >
      {method}
    </span>
  )
}

interface ParamRow {
  key: string
  value: string
}

export function ApiExplorer() {
  const { data: endpoints = [], isPending } = useAdminApiEndpoints()
  const tryMutation = useTryAdminEndpoint()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [paramRows, setParamRows] = useState<ParamRow[]>([{ key: '', value: '' }])
  const [bodyText, setBodyText] = useState<string>('')
  const [response, setResponse] = useState<TryAdminEndpointResult | null>(null)
  const [, startTransition] = useTransition()

  const groups = useMemo(() => {
    const map = new Map<string, AdminApiEndpoint[]>()
    for (const ep of endpoints) {
      const list = map.get(ep.group) ?? []
      list.push(ep)
      map.set(ep.group, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'tr'))
  }, [endpoints])

  const selected = useMemo(
    () => endpoints.find((e) => e.id === selectedId) ?? null,
    [endpoints, selectedId],
  )

  function handleSelect(ep: AdminApiEndpoint) {
    setSelectedId(ep.id)
    setResponse(null)
    // Prefill params from required fields with example value.
    const prefill: ParamRow[] = []
    for (const [key, schema] of Object.entries(ep.requestSchema.properties)) {
      if (schema.example !== undefined && schema.required) {
        prefill.push({ key, value: String(schema.example) })
      }
    }
    setParamRows(prefill.length > 0 ? prefill : [{ key: '', value: '' }])
    // Build prefill body (POST/PUT/PATCH).
    if (ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'PATCH') {
      const body: Record<string, unknown> = {}
      for (const [key, schema] of Object.entries(ep.requestSchema.properties)) {
        if (schema.example !== undefined) body[key] = schema.example
      }
      setBodyText(Object.keys(body).length > 0 ? JSON.stringify(body, null, 2) : '')
    } else {
      setBodyText('')
    }
  }

  function handleSend() {
    if (!selected) return
    const params: Record<string, string> = {}
    for (const row of paramRows) {
      if (row.key.trim()) params[row.key.trim()] = row.value
    }
    let body: Record<string, unknown> | undefined
    if (bodyText.trim()) {
      try {
        body = JSON.parse(bodyText) as Record<string, unknown>
      } catch {
        setResponse({
          endpointId: selected.id,
          status: 400,
          data: { error: 'Geçersiz JSON body' },
          latencyMs: 0,
        })
        return
      }
    }
    startTransition(() => {
      tryMutation.mutate(
        { endpointId: selected.id, params, body },
        {
          onSuccess: (res) => setResponse(res),
        },
      )
    })
  }

  return (
    <PageShell
      eyebrow="MOD · S01 · API EXPLORER"
      title={
        <>
          REST API <em className="font-serif italic font-light">canlı tester</em>
        </>
      }
      description={`${endpoints.length} endpoint · ${groups.length} grup. Try-it formu mock response döner (latency 80-320ms).`}
    >
      {isPending && endpoints.length === 0 ? (
        <div className="grid h-[60vh] place-items-center text-sm text-muted-foreground">
          Endpoints yükleniyor…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
          {/* Sol sidebar — endpoint listesi */}
          <aside className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Endpoint kataloğu
              </div>
            </div>
            <nav className="max-h-[70vh] overflow-y-auto p-2">
              {groups.map(([group, items]) => {
                const open = openGroups[group] ?? true
                return (
                  <div key={group} className="mb-1">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroups((prev) => ({ ...prev, [group]: !open }))
                      }
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition hover:bg-foreground/[0.04]"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/70">
                        {group}
                      </span>
                      <ChevronRight
                        className={cn(
                          'h-3 w-3 text-muted-foreground transition-transform',
                          open && 'rotate-90',
                        )}
                      />
                    </button>
                    {open && (
                      <ul className="mt-0.5 space-y-0.5">
                        {items.map((ep) => (
                          <li key={ep.id}>
                            <button
                              type="button"
                              onClick={() => handleSelect(ep)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition',
                                selectedId === ep.id
                                  ? 'bg-foreground/[0.06]'
                                  : 'hover:bg-foreground/[0.03]',
                              )}
                            >
                              <MethodBadge method={ep.method} />
                              <span className="truncate font-mono text-[11px] text-foreground/80">
                                {ep.path}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </nav>
          </aside>

          {/* Sağ pane — endpoint detay */}
          <section className="rounded-2xl border border-border bg-card">
            {!selected ? (
              <div className="grid h-[60vh] place-items-center p-8 text-center text-sm text-muted-foreground">
                Sol panelden bir endpoint seç.
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <header className="border-b border-border pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <MethodBadge method={selected.method} />
                    <code className="font-mono text-sm text-foreground/90">
                      {selected.path}
                    </code>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {selected.authRequired ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <Unlock className="h-3 w-3" />
                      )}
                      {selected.authRequired ? 'Auth gerekli' : 'Public'}
                    </span>
                    {selected.rateLimit && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        {selected.rateLimit}/s
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-foreground/80">
                    {selected.description}
                  </p>
                </header>

                {/* Request schema */}
                <section>
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Request schema
                  </h3>
                  <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground/80">
                    <code>{JSON.stringify(selected.requestSchema, null, 2)}</code>
                  </pre>
                </section>

                {/* Try-it: params */}
                <section>
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Parametreler (key · value)
                  </h3>
                  <div className="space-y-2">
                    {paramRows.map((row, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="key"
                          value={row.key}
                          onChange={(e) => {
                            const next = [...paramRows]
                            next[i] = { ...next[i]!, key: e.target.value }
                            setParamRows(next)
                          }}
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-[12px] outline-none transition focus:border-foreground/30"
                        />
                        <input
                          type="text"
                          placeholder="value"
                          value={row.value}
                          onChange={(e) => {
                            const next = [...paramRows]
                            next[i] = { ...next[i]!, value: e.target.value }
                            setParamRows(next)
                          }}
                          className="flex-[2] rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-[12px] outline-none transition focus:border-foreground/30"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (paramRows.length === 1) {
                              setParamRows([{ key: '', value: '' }])
                            } else {
                              setParamRows(paramRows.filter((_, idx) => idx !== i))
                            }
                          }}
                          className="rounded-lg border border-border bg-background px-2 text-[12px] text-muted-foreground transition hover:bg-foreground/[0.04]"
                          aria-label="Satırı sil"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setParamRows([...paramRows, { key: '', value: '' }])
                      }
                      className="rounded-lg border border-dashed border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:border-foreground/30 hover:text-foreground/80"
                    >
                      + Satır ekle
                    </button>
                  </div>
                </section>

                {/* Try-it: body */}
                {(selected.method === 'POST' ||
                  selected.method === 'PUT' ||
                  selected.method === 'PATCH') && (
                  <section>
                    <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Body (JSON)
                    </h3>
                    <textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      rows={8}
                      className="w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed outline-none transition focus:border-foreground/30"
                      placeholder='{ "key": "value" }'
                      spellCheck={false}
                    />
                  </section>
                )}

                {/* Send */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={tryMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {tryMutation.isPending ? 'Gönderiliyor…' : 'Send'}
                  </button>
                  {tryMutation.isPending && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Mock response üretiliyor
                    </span>
                  )}
                </div>

                {/* Response */}
                {response && (
                  <section>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Response
                      </h3>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold',
                            response.status >= 200 && response.status < 300
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : response.status >= 400
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
                          )}
                        >
                          {response.status}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {response.latencyMs}ms
                        </span>
                      </div>
                    </div>
                    <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground/80">
                      <code>{JSON.stringify(response.data, null, 2)}</code>
                    </pre>
                  </section>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </PageShell>
  )
}
