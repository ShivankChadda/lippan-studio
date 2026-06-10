import { Modal } from './Modal'

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Tools',
    rows: [
      ['V', 'Select'], ['F', 'Paint region'], ['B', 'Boundary pen'],
      ['E', 'Boundary eraser'], ['I', 'Eyedropper'], ['M', 'Place mirror'],
    ],
  },
  {
    title: 'Editing',
    rows: [
      ['Ctrl+Z', 'Undo'], ['Shift+Ctrl+Z', 'Redo'], ['[ and ]', 'Brush size'],
      ['Delete', 'Delete selected mirror'], ['Arrow keys', 'Nudge mirror (Shift = bigger step)'],
      ['Alt+drag', 'Duplicate mirror'], ['Shift+click', 'Add to mirror selection'],
    ],
  },
  {
    title: 'View',
    rows: [
      ['Scroll / pinch', 'Zoom the stage'], ['Middle-drag / two fingers', 'Pan'],
      ['?', 'This sheet'], ['Esc', 'Close / deselect'],
    ],
  },
]

export function ShortcutSheet() {
  return (
    <Modal title="Keyboard shortcuts">
      <div className="flex flex-col gap-4">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="label-caps mb-1.5">{g.title}</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              {g.rows.map(([key, what]) => (
                <div key={key} className="contents">
                  <dt>
                    <kbd className="rounded-md bg-bonedeep px-2 py-0.5 font-mono text-[11px] font-medium shadow-swatch">
                      {key}
                    </kbd>
                  </dt>
                  <dd className="self-center text-[12px]">{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  )
}
