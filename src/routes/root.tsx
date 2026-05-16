import { lazy, Suspense, useCallback, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { AnimatedGrid, GlassFilter } from '@landx/ui'
import { AssistantDrawer, useAssistantShortcut } from '@landx/ui/ai'
import { ThemeToggle } from '@landx/ui/theme'
import { PersonaSwitcher } from '@landx/ui/persona-switcher'
import { ImpersonateBanner } from '@/components/impersonate/ImpersonateBanner'
import { useKeyboardShortcuts } from '@/components/keyboard/use-keyboard-shortcuts'
import { OpsAppDock } from '@/components/shell/OpsAppDock'
import { OpsDynamicIslandHeader } from '@/components/shell/OpsDynamicIslandHeader'

const ShortcutsOverlay = lazy(() => import('@/components/keyboard/ShortcutsOverlay'))
const CommandPalette = lazy(() => import('@/components/command/CommandPalette'))

export function RootLayout() {
  const navigate = useNavigate()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const aiDrawer = useAssistantShortcut()
  const openShortcuts = useCallback(() => setShortcutsOpen(true), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])
  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])
  useKeyboardShortcuts({
    openOverlay: openShortcuts,
    closeOverlay: closeShortcuts,
    openCommandPalette: openPalette,
    closeCommandPalette: closePalette,
  })

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <GlassFilter />
      <AnimatedGrid />
      <ImpersonateBanner />
      <OpsDynamicIslandHeader onOpenAssistant={openPalette} />
      <div className="fixed right-4 top-4 z-40 pointer-events-auto flex items-center gap-2">
        <PersonaSwitcher />
        <ThemeToggle align="end" />
      </div>
      <main className="relative z-10 pt-24">
        <Outlet />
      </main>
      <OpsAppDock />
      <AssistantDrawer
        open={aiDrawer.open}
        onClose={() => aiDrawer.setOpen(false)}
        role="admin"
        initialMessage="Süper admin paneli — onay kuyruğu, ECA kuralları, tenants, audit gibi konularda yardımcı olabilirim. Cmd+J ile aç/kapa."
        onSuggestion={(s) => {
          if (s.href) navigate(s.href)
          aiDrawer.setOpen(false)
        }}
      />
      <Suspense fallback={null}>
        <ShortcutsOverlay open={shortcutsOpen} onClose={closeShortcuts} />
      </Suspense>
      <Suspense fallback={null}>
        {paletteOpen && <CommandPalette open={paletteOpen} onClose={closePalette} />}
      </Suspense>
    </div>
  )
}
