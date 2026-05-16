import { useCallback, useState } from 'react'
import { Loader2, Search } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { queryParcel, tkgmCodeMessage, type TkgmQuery } from '@landx/ai'

const STORAGE_KEY = 'landx:tkgm:history'

function loadHistory(): TkgmQuery[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TkgmQuery[]) : []
  } catch {
    return []
  }
}

function saveHistory(items: TkgmQuery[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100)))
  } catch {
    /* quota errors yutuluyor */
  }
}

const STATUS_TONE: Record<TkgmQuery['status'], string> = {
  OK: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  E001: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  E002: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  E003: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  E099: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

export function Tkgm() {
  const [items, setItems] = useState<TkgmQuery[]>(() => loadHistory())
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ il: '', ilce: '', ada: '', parsel: '' })

  const update = useCallback(<K extends keyof typeof form>(k: K, v: string) => {
    setForm((prev) => ({ ...prev, [k]: v }))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.il || !form.ilce || !form.ada || !form.parsel || busy) return
    setBusy(true)
    try {
      const q = await queryParcel({ ...form, userId: 'super-admin' })
      const next = [q, ...items].slice(0, 100)
      setItems(next)
      saveHistory(next)
    } finally {
      setBusy(false)
    }
  }

  const clear = () => {
    setItems([])
    saveHistory([])
  }

  const okCount = items.filter((i) => i.status === 'OK').length
  const errCount = items.length - okCount

  return (
    <PageShell
      eyebrow="MOD · TKGM"
      title={
        <>
          TKGM <em className="font-serif italic font-light">sorgu geçmişi</em>
        </>
      }
      description={`${items.length} sorgu · ${okCount} başarılı · ${errCount} hatalı (mock API · ~25% hata oranı).`}
      actions={
        items.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            Geçmişi temizle
          </button>
        )
      }
    >
      <form
        onSubmit={submit}
        className="mb-8 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-5"
      >
        {(['il', 'ilce', 'ada', 'parsel'] as const).map((k) => (
          <label key={k} className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {k}
            </span>
            <input
              type="text"
              value={form[k]}
              onChange={(e) => update(k, e.target.value)}
              data-testid={`tkgm-field-${k}`}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              required
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={busy}
          data-testid="tkgm-submit"
          className="inline-flex h-9 items-center justify-center gap-1.5 self-end rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {busy ? 'Sorgulanıyor…' : 'TKGM sorgula'}
        </button>
      </form>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
          Henüz sorgu yok. Yukarıdaki formdan bir parsel sorgulayın.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((q) => (
            <li
              key={q.id}
              data-testid="tkgm-row"
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
                        STATUS_TONE[q.status],
                      )}
                    >
                      {q.status}
                    </span>
                    <span className="text-sm font-medium">
                      {q.input.il} · {q.input.ilce}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      ada {q.input.ada} · parsel {q.input.parsel}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[12px] text-muted-foreground">
                    {tkgmCodeMessage(q.status)}
                  </div>
                  {q.result && (
                    <div className="mt-2 grid gap-1.5 text-[12px] md:grid-cols-3">
                      <Field label="Mahalle" value={q.result.mahalle} />
                      <Field label="Yüzölçümü" value={`${q.result.yuzolcumu} m²`} />
                      <Field label="Cinsi" value={q.result.cinsi} />
                      {q.result.hisse && <Field label="Hisse" value={q.result.hisse} />}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
                  <div>{new Date(q.createdAt).toLocaleString('tr-TR')}</div>
                  <div className="mt-0.5">{q.latencyMs}ms</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="text-foreground">{value}</div>
    </div>
  )
}
