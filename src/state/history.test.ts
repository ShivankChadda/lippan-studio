import { describe, expect, it } from 'vitest'
import { History, type Command } from './history'

function counterCmd(state: { v: number }, delta: number, label = 'step'): Command {
  return { label, redo: () => (state.v += delta), undo: () => (state.v -= delta) }
}

describe('History (command pattern)', () => {
  it('undoes and redoes in order', () => {
    const h = new History()
    const s = { v: 0 }
    s.v += 1; h.push(counterCmd(s, 1))
    s.v += 10; h.push(counterCmd(s, 10))
    expect(s.v).toBe(11)
    h.undo(); expect(s.v).toBe(1)
    h.undo(); expect(s.v).toBe(0)
    expect(h.canUndo).toBe(false)
    expect(h.undo()).toBe(false)
    h.redo(); h.redo()
    expect(s.v).toBe(11)
    expect(h.canRedo).toBe(false)
  })

  it('clears the redo stack on a new push', () => {
    const h = new History()
    const s = { v: 0 }
    s.v += 1; h.push(counterCmd(s, 1))
    h.undo()
    s.v += 5; h.push(counterCmd(s, 5))
    expect(h.canRedo).toBe(false)
    expect(s.v).toBe(5)
  })

  it('supports at least 50 steps and respects its limit', () => {
    const h = new History(64)
    const s = { v: 0 }
    for (let i = 0; i < 80; i++) { s.v += 1; h.push(counterCmd(s, 1)) }
    expect(s.v).toBe(80)
    let undone = 0
    while (h.undo()) undone++
    expect(undone).toBe(64) // capped at limit, comfortably ≥ 50
    expect(s.v).toBe(16)
  })

  it('covers mixed operation types as labeled commands', () => {
    const h = new History()
    const log: string[] = []
    const ops = ['paint', 'boundary', 'ridge', 'mirror', 'shuffle']
    for (const op of ops) {
      log.push(op)
      h.push({ label: op, undo: () => log.pop(), redo: () => log.push(op) })
    }
    expect(h.undoLabel).toBe('shuffle')
    h.undo()
    expect(log).toEqual(['paint', 'boundary', 'ridge', 'mirror'])
    h.redo()
    expect(log).toEqual(ops)
  })
})
