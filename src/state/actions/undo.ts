import { histories } from '../runtime'
import { useStore } from '../store'

export function undo(): void {
  const s = useStore.getState()
  if (histories[s.mode].undo()) s.bump('historyVersion')
}

export function redo(): void {
  const s = useStore.getState()
  if (histories[s.mode].redo()) s.bump('historyVersion')
}

export function activeHistory() {
  return histories[useStore.getState().mode]
}
