import { useMemo, useState } from 'react'
import { Download, BarChart3 } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { MonthlySalesLine } from '@landx/ui'

interface ReportRow {
  month: string
  newListings: number
  approvedListings: number
  rejectedListings: number
  totalGmv: number
  closedDeals: number
  activeBuyers: number
}

const ROWS_2026: ReportRow[] = [
  { month: '2026-01', newListings: 142, approvedListings: 118, rejectedListings: 14, totalGmv: 184_500_000, closedDeals: 23, activeBuyers: 1_240 },
  { month: '2026-02', newListings: 168, approvedListings: 141, rejectedListings: 19, totalGmv: 212_000_000, closedDeals: 27, activeBuyers: 1_482 },
  { month: '2026-03', newListings: 195, approvedListings: 164, rejectedListings: 22, totalGmv: 256_800_000, closedDeals: 34, activeBuyers: 1_751 },
  { month: '2026-04', newListings: 211, approvedListings: 184, rejectedListings: 18, totalGmv: 298_400_000, closedDeals: 41, activeBuyers: 1_988 },
  { month: '2026-05', newListings: 226, approvedListings: 201, rejectedListings: 17, totalGmv: 327_600_000, closedDeals: 47, activeBuyers: 2_142 },
]

const ROWS_2025: ReportRow[] = [
  { month: '2025-09', newListings: 98, approvedListings: 82, rejectedListings: 9, totalGmv: 124_500_000, closedDeals: 15, activeBuyers: 856 },
  { month: '2025-10', newListings: 112, approvedListings: 94, rejectedListings: 12, totalGmv: 141_200_000, closedDeals: 18, activeBuyers: 945 },
  { month: '2025-11', newListings: 126, approvedListings: 105, rejectedListings: 14, totalGmv: 158_900_000, closedDeals: 20, activeBuyers: 1_062 },
  { month: '2025-12', newListings: 131, approvedListings: 108, rejectedListings: 16, totalGmv: 166_300_000, closedDeals: 21, activeBuyers: 1_148 },
]

type Range = '2026' | 'last9'

function buildCsv(rows: ReportRow[]): string {
  const header = [
    'Ay',
    'Yeni İlan',
    'Onaylanan',
    'Reddedilen',
    'GMV (₺)',
    'Kapanan Anlaşma',
    'Aktif Alıcı',
  ].join(',')
  const body = rows
    .map((r) =>
      [
        r.month,
        r.newListings,
        r.approvedListings,
        r.rejectedListings,
        r.totalGmv,
        r.closedDeals,
        r.activeBuyers,
      ].join(','),
    )
    .join('\n')
  return `${header}\n${body}`
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function Reports() {
  const [range, setRange] = useState<Range>('2026')

  const rows = useMemo(
    () => (range === '2026' ? ROWS_2026 : [...ROWS_2025, ...ROWS_2026]),
    [range],
  )

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          newListings: acc.newListings + r.newListings,
          approvedListings: acc.approvedListings + r.approvedListings,
          rejectedListings: acc.rejectedListings + r.rejectedListings,
          totalGmv: acc.totalGmv + r.totalGmv,
          closedDeals: acc.closedDeals + r.closedDeals,
        }),
        { newListings: 0, approvedListings: 0, rejectedListings: 0, totalGmv: 0, closedDeals: 0 },
      ),
    [rows],
  )

  const handleExport = () => {
    const csv = buildCsv(rows)
    const filename = `landx-rapor-${range}-${new Date().toISOString().slice(0, 10)}.csv`
    downloadCsv(filename, csv)
  }

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        month: r.month.slice(5),
        revenue: Math.round(r.totalGmv / 1_000_000),
        count: r.closedDeals,
      })),
    [rows],
  )

  return (
    <PageShell
      eyebrow="MOD · REPORTS"
      title={
        <>
          Platform <em className="font-serif italic font-light">raporları</em>
        </>
      }
      description={`${rows.length} aylık veri · CSV olarak indir, kendi BI aracında analiz et.`}
      actions={
        <button
          type="button"
          onClick={handleExport}
          data-testid="reports-export"
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          <Download className="h-4 w-4" />
          CSV indir
        </button>
      }
    >
      <section className="mb-5 flex items-center gap-2">
        {(['2026', 'last9'] as const).map((k) => {
          const active = range === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setRange(k)}
              data-testid={`reports-range-${k}`}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[13px] font-medium transition',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {k === '2026' ? '2026 Y2D' : 'Son 9 ay'}
            </button>
          )
        })}
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Yeni ilan" value={totals.newListings.toLocaleString('tr-TR')} />
        <Stat label="Onaylanan" value={totals.approvedListings.toLocaleString('tr-TR')} />
        <Stat label="Reddedilen" value={totals.rejectedListings.toLocaleString('tr-TR')} />
        <Stat label="GMV (₺)" value={`${Math.round(totals.totalGmv / 1_000_000)}M`} />
        <Stat label="Kapanan anlaşma" value={totals.closedDeals.toLocaleString('tr-TR')} />
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 opacity-60" />
          <h2 className="font-medium">Aylık GMV (milyon ₺)</h2>
        </div>
        <div className="h-64">
          <MonthlySalesLine data={chartData} />
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm" data-testid="reports-table">
          <thead className="border-b border-border bg-foreground/[0.04] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Ay</th>
              <th className="px-4 py-2.5 text-right">Yeni</th>
              <th className="px-4 py-2.5 text-right">Onay</th>
              <th className="px-4 py-2.5 text-right">Red</th>
              <th className="px-4 py-2.5 text-right">GMV</th>
              <th className="px-4 py-2.5 text-right">Anlaşma</th>
              <th className="px-4 py-2.5 text-right">Alıcı</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-mono text-[12px]">{r.month}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.newListings}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                  {r.approvedListings}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-rose-700 dark:text-rose-300">
                  {r.rejectedListings}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  ₺{(r.totalGmv / 1_000_000).toFixed(1)}M
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.closedDeals}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {r.activeBuyers.toLocaleString('tr-TR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-xl font-light tabular-nums">{value}</div>
    </article>
  )
}
