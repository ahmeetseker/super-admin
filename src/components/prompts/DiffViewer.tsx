// Wave F12.C — side-by-side line diff viewer.
// Uses platform-prompts `diffLines` (simple line-by-line). Removed lines paint
// the LEFT column with `bg-rose-100`; added lines paint the RIGHT column with
// `bg-emerald-100`. Equal lines render both sides plain.

import { useMemo } from 'react'
import { cn } from '@landx/ui'
import { diffLines, type PromptVersion } from '@/lib/platform-prompts'

export interface DiffViewerProps {
  left: PromptVersion
  right: PromptVersion
}

export default function DiffViewer({ left, right }: DiffViewerProps) {
  const ops = useMemo(() => diffLines(left.template, right.template), [left, right])

  const addedCount = ops.filter((o) => o.op === 'add').length
  const removedCount = ops.filter((o) => o.op === 'del').length

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid="prompts-diff-viewer"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="font-mono text-[11px] tabular-nums text-foreground/80">
          <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-rose-700 dark:text-rose-300">
            − {left.version}
          </span>
          <span className="mx-2 text-muted-foreground">→</span>
          <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">
            + {right.version}
          </span>
        </div>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          +{addedCount} eklenen · −{removedCount} silinen
        </span>
      </header>

      <div className="grid grid-cols-2 divide-x divide-border text-[12px] leading-relaxed">
        {/* LEFT column — original */}
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="diff-left">
            <tbody>
              {ops.map((op, i) => {
                const isDel = op.op === 'del'
                const isEmpty = op.op === 'add'
                return (
                  <tr
                    key={`l-${i}`}
                    className={cn(
                      isDel && 'bg-rose-100 dark:bg-rose-950/40',
                      isEmpty && 'bg-foreground/[0.02]',
                    )}
                    data-op={op.op}
                  >
                    <td className="w-8 select-none px-2 py-0.5 text-right font-mono text-[10px] text-muted-foreground/60">
                      {isEmpty ? '' : i + 1}
                    </td>
                    <td className="w-4 select-none px-1 py-0.5 font-mono text-[10px] text-rose-600 dark:text-rose-300">
                      {isDel ? '−' : ''}
                    </td>
                    <td className="whitespace-pre-wrap break-all px-2 py-0.5 font-mono text-[11.5px] text-foreground/85">
                      {op.left ?? ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* RIGHT column — new */}
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="diff-right">
            <tbody>
              {ops.map((op, i) => {
                const isAdd = op.op === 'add'
                const isEmpty = op.op === 'del'
                return (
                  <tr
                    key={`r-${i}`}
                    className={cn(
                      isAdd && 'bg-emerald-100 dark:bg-emerald-950/40',
                      isEmpty && 'bg-foreground/[0.02]',
                    )}
                    data-op={op.op}
                  >
                    <td className="w-8 select-none px-2 py-0.5 text-right font-mono text-[10px] text-muted-foreground/60">
                      {isEmpty ? '' : i + 1}
                    </td>
                    <td className="w-4 select-none px-1 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
                      {isAdd ? '+' : ''}
                    </td>
                    <td className="whitespace-pre-wrap break-all px-2 py-0.5 font-mono text-[11.5px] text-foreground/85">
                      {op.right ?? ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
