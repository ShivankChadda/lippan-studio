/**
 * Command-pattern undo/redo. Callers apply the action first, then push a
 * command describing how to undo/redo it (execute-then-record), which keeps
 * async operations (worker fills) simple.
 */
export interface Command {
  label: string
  undo(): void
  redo(): void
}

export class History {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private listeners = new Set<() => void>()

  constructor(private limit = 64) {}

  push(cmd: Command): void {
    this.undoStack.push(cmd)
    if (this.undoStack.length > this.limit) this.undoStack.shift()
    this.redoStack = []
    this.emit()
  }

  undo(): boolean {
    const cmd = this.undoStack.pop()
    if (!cmd) return false
    cmd.undo()
    this.redoStack.push(cmd)
    this.emit()
    return true
  }

  redo(): boolean {
    const cmd = this.redoStack.pop()
    if (!cmd) return false
    cmd.redo()
    this.undoStack.push(cmd)
    this.emit()
    return true
  }

  get canUndo(): boolean { return this.undoStack.length > 0 }
  get canRedo(): boolean { return this.redoStack.length > 0 }
  get undoLabel(): string | null { return this.undoStack[this.undoStack.length - 1]?.label ?? null }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.emit()
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    for (const fn of this.listeners) fn()
  }
}
