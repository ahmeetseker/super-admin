// Wave F12.C — single-version detail panel.
// Full template body + change reason + usage + version selectors.
// Two select dropdowns let the operator pick left/right sides of the diff.

import { cn } from '@landx/ui'
import { STATUS_LABEL, STATUS_TONE, type PromptGroup, type PromptVersion } from '@/lib/platform-prompts'

export interface VersionDetailProps {
  group: PromptGroup
  leftVersionId: string
  rightVersionId: string
  onLeftChange: (id: string) => void
  onRightChange: (id: string) => void
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function VersionPanel({
  label,
  group,
  selectedId,
  onChange,
  side,
}: {
  label: string
  group: PromptGroup
  selectedId: string
  onChange: (id: string) => void
  side: 'left' | 'right'
}) {
  const version = group.versions.find((v) => v.id === selectedId) ?? group.versions[0]
  return (
    <article
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
      data-testid={`prompts-version-panel-${side}`}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-border bg-background/40 px-2.5 py-1 font-mono text-[12px] text-foreground/90"
          data-testid={`prompts-version-select-${side}`}
        >
          {group.versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.version} ({STATUS_LABEL[v.status]})
            </option>
          ))}
        </select>
      </header>

      <Detail version={version} />
    </article>
  )
}

function Detail({ version }: { version: PromptVersion }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium',
            STATUS_TONE[version.status],
          )}
        >
          {STATUS_LABEL[version.status]}
        </span>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          {version.version}
        </span>
        <span className="font-mono text-[10.5px] text-muted-foreground">·</span>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          {fmtDate(version.createdAtMs)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background/30 p-2.5">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Kullanım
          </div>
          <div className="mt-0.5 font-mono text-[12.5px] tabular-nums text-foreground/90">
            {fmtCount(version.usageCount)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Değişiklik nedeni
          </div>
          <div
            className="mt-0.5 font-mono text-[11.5px] text-foreground/85"
            data-testid="prompts-change-reason"
          >
            {version.changeReason}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Şablon gövdesi
        </div>
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-all rounded-xl border border-border bg-background/40 p-3 font-mono text-[11.5px] leading-relaxed text-foreground/85">
{version.template}
        </pre>
      </div>
    </>
  )
}

export default function VersionDetail({
  group,
  leftVersionId,
  rightVersionId,
  onLeftChange,
  onRightChange,
}: VersionDetailProps) {
  return (
    <section
      className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2"
      data-testid="prompts-version-detail"
    >
      <VersionPanel
        label="Sol sürüm"
        group={group}
        selectedId={leftVersionId}
        onChange={onLeftChange}
        side="left"
      />
      <VersionPanel
        label="Sağ sürüm"
        group={group}
        selectedId={rightVersionId}
        onChange={onRightChange}
        side="right"
      />
    </section>
  )
}
