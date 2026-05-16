/**
 * /agent-memory — Wave F35 / Faz 2.
 *
 * Agent Memory Layer Viewer — 4 layer (short / long / episodic / procedural)
 * tab navigation. Her tab: layer açıklaması, token count, en yeni 25 entry
 * listesi, embedding modal'ı, UMAP scatter (8d → 2d ilk iki boyut).
 */
import { useMemo, useState } from 'react'
import { Brain, X, Activity } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  useAgentMemoryLayers,
  type AgentMemoryEntry,
  type AgentMemoryLayer,
  type AgentMemoryLayerType,
} from '@landx/data'

const LAYER_LABEL: Record<AgentMemoryLayerType, string> = {
  short: 'Kısa süreli',
  long: 'Uzun vadeli',
  episodic: 'Episodik',
  procedural: 'Prosedürel',
}

const LAYER_COLOR: Record<AgentMemoryLayerType, string> = {
  short: '#10b981', // emerald
  long: '#3b82f6', // sky
  episodic: '#a855f7', // violet
  procedural: '#f59e0b', // amber
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min}d önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

interface ScatterPoint {
  x: number
  y: number
  layer: AgentMemoryLayerType
  content: string
  accessCount: number
  id: string
}

export function AgentMemory() {
  const { data: layers = [], isPending } = useAgentMemoryLayers()
  const [activeLayer, setActiveLayer] = useState<AgentMemoryLayerType>('short')
  const [embeddingEntry, setEmbeddingEntry] = useState<AgentMemoryEntry | null>(null)

  const activeLayerData = useMemo<AgentMemoryLayer | undefined>(
    () => layers.find((l) => l.type === activeLayer),
    [layers, activeLayer],
  )

  const visibleEntries = useMemo<AgentMemoryEntry[]>(() => {
    if (!activeLayerData) return []
    return [...activeLayerData.entries]
      .sort((a, b) => (a.lastAccessedAt < b.lastAccessedAt ? 1 : -1))
      .slice(0, 25)
  }, [activeLayerData])

  // UMAP scatter — flatten all layers, project embedding[0..1] * 100.
  const scatterByLayer = useMemo(() => {
    const byLayer: Record<AgentMemoryLayerType, ScatterPoint[]> = {
      short: [],
      long: [],
      episodic: [],
      procedural: [],
    }
    for (const layer of layers) {
      for (const entry of layer.entries) {
        const e0 = entry.embedding[0] ?? 0
        const e1 = entry.embedding[1] ?? 0
        byLayer[entry.layerType].push({
          x: Number((e0 * 100).toFixed(2)),
          y: Number((e1 * 100).toFixed(2)),
          layer: entry.layerType,
          content: entry.content,
          accessCount: entry.accessCount,
          id: entry.id,
        })
      }
    }
    return byLayer
  }, [layers])

  const totalEntries = useMemo(
    () => layers.reduce((sum, l) => sum + l.entries.length, 0),
    [layers],
  )

  return (
    <PageShell
      eyebrow="MOD · A04 · MEMORY"
      title={
        <>
          Agent <em className="font-serif italic font-light">belleği</em>
        </>
      }
      description={`${totalEntries.toLocaleString('tr-TR')} entry · 4 katman · 8 boyutlu mock embedding (UMAP projeksiyonu).`}
    >
      {isPending && layers.length === 0 ? (
        <div className="grid h-[40vh] place-items-center text-sm text-muted-foreground">
          Layer'lar yükleniyor…
        </div>
      ) : (
        <>
          {/* Tab nav */}
          <div className="mb-5 inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1">
            {(['short', 'long', 'episodic', 'procedural'] as const).map((type) => {
              const layer = layers.find((l) => l.type === type)
              const count = layer?.entries.length ?? 0
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveLayer(type)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition',
                    activeLayer === type
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: LAYER_COLOR[type] }}
                  />
                  {LAYER_LABEL[type]}
                  <span className="font-mono text-[10px] tabular-nums opacity-70">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {activeLayerData && (
            <section className="mb-6 rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {LAYER_LABEL[activeLayerData.type]}
                  </div>
                  <p className="mt-1 text-sm text-foreground/80">
                    {activeLayerData.description}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-[11px]">
                    {activeLayerData.totalTokens.toLocaleString('tr-TR')} token
                  </span>
                  <span className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-[11px]">
                    {activeLayerData.entries.length} entry
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* UMAP Scatter */}
          <section className="mb-6 rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    UMAP Projection
                  </div>
                  <div className="font-serif text-base">
                    Embedding 2D <em className="font-serif italic font-light">harita</em>
                  </div>
                </div>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  8d → 2d (ilk iki boyut)
                </span>
              </div>
            </div>
            <div className="h-[320px] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="currentColor" className="text-foreground/10" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="dim 1"
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    className="text-foreground/60"
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="dim 2"
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    className="text-foreground/60"
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null
                      const p = payload[0]?.payload as ScatterPoint
                      return (
                        <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
                          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            {LAYER_LABEL[p.layer]} · {p.id}
                          </div>
                          <div className="mt-1 max-w-xs text-[11.5px] text-foreground/80">
                            {p.content}
                          </div>
                          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                            erişim: {p.accessCount}
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {(['short', 'long', 'episodic', 'procedural'] as const).map((type) => (
                    <Scatter
                      key={type}
                      name={LAYER_LABEL[type]}
                      data={scatterByLayer[type]}
                      fill={LAYER_COLOR[type]}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Entry list */}
          <section className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Son 25 entry · {LAYER_LABEL[activeLayer]}
              </div>
            </div>
            <ul className="divide-y divide-border">
              {visibleEntries.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className="mt-1.5 h-2 w-2 flex-none rounded-full"
                    style={{ backgroundColor: LAYER_COLOR[entry.layerType] }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-foreground/90">{entry.content}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted-foreground">
                      <span>{entry.id}</span>
                      <span>agent: {entry.agentId}</span>
                      <span>token: {entry.tokens}</span>
                      <span title={entry.lastAccessedAt}>
                        {formatRelative(entry.lastAccessedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {entry.accessCount} erişim
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmbeddingEntry(entry)}
                    className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground"
                  >
                    <Brain className="h-3 w-3" />
                    Embedding
                  </button>
                </li>
              ))}
              {visibleEntries.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Bu katmanda kayıt yok.
                </li>
              )}
            </ul>
          </section>

          {/* Embedding modal */}
          {embeddingEntry && (
            <div
              className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4"
              onClick={() => setEmbeddingEntry(null)}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {LAYER_LABEL[embeddingEntry.layerType]} · {embeddingEntry.id}
                    </div>
                    <div className="mt-1 text-[13px] text-foreground/90">
                      {embeddingEntry.content}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmbeddingEntry(null)}
                    aria-label="Kapat"
                    className="rounded-lg border border-border bg-background p-1 text-muted-foreground transition hover:bg-foreground/[0.04]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Embedding (8d)
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {embeddingEntry.embedding.map((v, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-center"
                      >
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                          d{i}
                        </div>
                        <div className="font-mono text-[11px] tabular-nums text-foreground/90">
                          {v.toFixed(3)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  )
}
