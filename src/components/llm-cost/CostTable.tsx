// Wave F12.A — LLM per-model cost table with sortable columns.
import { useMemo, useState } from 'react'
import { type ModelSummaryRow, MODEL_LABEL } from '@/lib/platform-llm-cost'

const TL_FMT = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 })
const COUNT_FMT = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 })

type SortKey = 'totalCostTL' | 'callCount' | 'avgCostTL' | 'totalTokens'
type SortDir = 'asc' | 'desc'

export interface CostTableProps {
  rows: readonly ModelSummaryRow[]
}

export default function CostTable({ rows }: CostTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalCostTL')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number)
      return sortDir === 'asc' ? diff : -diff
    })
    return copy
  }, [rows, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card" data-testid="llm-cost-table">
      <div className="border-b border-border px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Model özeti
        </div>
        <div className="font-serif text-base">Maliyet kırılımı</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-background/30">
            <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-2.5">Model</th>
              <SortHeader label="Çağrı" k="callCount" current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHeader label="Toplam ₺" k="totalCostTL" current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHeader label="Ort. ₺" k="avgCostTL" current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHeader label="Token" k="totalTokens" current={sortKey} dir={sortDir} onClick={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((r) => (
              <tr key={r.model} data-testid={`llm-row-${r.model}`} className="hover:bg-foreground/[0.02]">
                <td className="px-3 py-3 align-top text-[12.5px] font-medium">{MODEL_LABEL[r.model]}</td>
                <td className="px-3 py-3 text-right align-top font-mono text-[11.5px] tabular-nums">
                  {r.callCount}
                </td>
                <td className="px-3 py-3 text-right align-top font-mono text-[11.5px] tabular-nums">
                  {TL_FMT.format(r.totalCostTL)}
                </td>
                <td className="px-3 py-3 text-right align-top font-mono text-[11.5px] tabular-nums">
                  {TL_FMT.format(r.avgCostTL)}
                </td>
                <td className="px-3 py-3 text-right align-top font-mono text-[11.5px] tabular-nums">
                  {COUNT_FMT.format(r.totalTokens)}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                  Filtre eşleşmesi yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortHeader({
  label,
  k,
  current,
  dir,
  onClick,
}: {
  label: string
  k: SortKey
  current: SortKey
  dir: SortDir
  onClick: (k: SortKey) => void
}) {
  const active = current === k
  return (
    <th className="px-3 py-2.5 text-right">
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 ${active ? 'text-foreground' : 'text-muted-foreground'} hover:text-foreground`}
        data-testid={`llm-sort-${k}`}
      >
        {label}
        {active && <span aria-hidden>{dir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  )
}
