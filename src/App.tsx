import { useEffect } from 'react'
import { useShortcuts } from './hooks/useShortcuts'
import { bootFromStorage, initAutosave } from './state/actions/project'
import { histories } from './state/runtime'
import { useStore } from './state/store'
import { CoachMarks } from './components/shell/CoachMarks'
import { Header } from './components/shell/Header'
import { Toasts } from './components/shell/Toasts'
import { ToolRail } from './components/shell/ToolRail'
import { PhotoStage } from './components/stage/PhotoStage'
import { TemplateStage } from './components/stage/TemplateStage'
import { RightPanel } from './components/panel/RightPanel'
import { CompareModal } from './components/modals/CompareModal'
import { ExportModal } from './components/modals/ExportModal'
import { ExtractModal } from './components/modals/ExtractModal'
import { MaterialSheet } from './components/modals/MaterialSheet'
import { ShortcutSheet } from './components/modals/ShortcutSheet'
import { WallModal } from './components/modals/WallModal'

let booted = false

export default function App() {
  const mode = useStore((s) => s.mode)
  const modal = useStore((s) => s.modal)
  useShortcuts()

  useEffect(() => {
    // history stacks live outside the store — mirror their changes into
    // historyVersion so undo/redo buttons stay in sync
    const bumpHistory = () => useStore.getState().bump('historyVersion')
    const un1 = histories.photo.subscribe(bumpHistory)
    const un2 = histories.template.subscribe(bumpHistory)
    if (!booted) {
      booted = true
      void bootFromStorage().then(initAutosave)
    }
    return () => { un1(); un2() }
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <div className="order-3 sm:order-1"><ToolRail /></div>
        <main className="mud-wall relative order-1 min-h-0 flex-1 sm:order-2">
          {mode === 'photo' ? <PhotoStage /> : <TemplateStage />}
        </main>
        <div className="order-2 flex min-h-0 sm:order-3"><RightPanel /></div>
      </div>
      <Toasts />
      <CoachMarks />
      {modal === 'export' && <ExportModal />}
      {modal === 'compare' && <CompareModal />}
      {modal === 'wall' && <WallModal />}
      {modal === 'extract' && <ExtractModal />}
      {modal === 'material' && <MaterialSheet />}
      {modal === 'shortcuts' && <ShortcutSheet />}
    </div>
  )
}
