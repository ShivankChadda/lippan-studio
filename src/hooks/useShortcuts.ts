import { useEffect } from 'react'
import { deleteMirrors, nudgeSelected } from '../state/actions/mirrors'
import { redo, undo } from '../state/actions/undo'
import { useStore } from '../state/store'
import type { Tool } from '../types'

const TOOL_KEYS: Record<string, Tool> = {
  v: 'select', f: 'fill', b: 'pen', e: 'eraser', i: 'eyedropper', m: 'mirror',
}

export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return
      const s = useStore.getState()

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === '?') {
        s.patch({ modal: s.modal === 'shortcuts' ? 'none' : 'shortcuts' })
        return
      }
      if (e.key === 'Escape') {
        if (s.modal !== 'none') s.patch({ modal: 'none' })
        else s.patch({ selectedMirrorIds: [], selectedRegion: null })
        return
      }
      if (e.key === '[') {
        s.patch({ brushSize: Math.max(2, s.brushSize - 2) })
        return
      }
      if (e.key === ']') {
        s.patch({ brushSize: Math.min(80, s.brushSize + 2) })
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (s.selectedMirrorIds.length > 0) {
          e.preventDefault()
          deleteMirrors(s.selectedMirrorIds)
        }
        return
      }
      if (e.key.startsWith('Arrow') && s.selectedMirrorIds.length > 0) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 2
        const d = {
          ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
        }[e.key as 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown']
        if (d) nudgeSelected(d[0], d[1])
        return
      }
      const tool = TOOL_KEYS[e.key.toLowerCase()]
      if (tool) {
        if ((tool === 'pen' || tool === 'eraser') && s.mode !== 'photo') return
        s.patch({ tool })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
