import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { CommandPaletteBase, type PaletteItem as BasePaletteItem } from '@landx/ui/command'
import {
  filteredSections,
  pushRecent,
  readRecent,
  type PaletteItem,
} from '@/lib/command-palette'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>([])

  const sections = useMemo(() => filteredSections(query), [query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setRecent(readRecent())
  }, [open])

  function activate(item: BasePaletteItem) {
    pushRecent(query)
    onClose()
    const full = item as PaletteItem
    if (full.action) {
      full.action()
      return
    }
    if (full.to) navigate(full.to)
  }

  return (
    <CommandPaletteBase
      open={open}
      onClose={onClose}
      query={query}
      onQueryChange={setQuery}
      sections={sections}
      recent={recent}
      onActivate={activate}
      ariaLabel="Komut paleti"
      placeholder="Komut, sayfa, tenant veya audit ara…"
      brand="arsam ops"
    />
  )
}
