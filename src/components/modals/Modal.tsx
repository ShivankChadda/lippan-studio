import type { ReactNode } from 'react'
import { useStore } from '../../state/store'
import { IconClose } from '../ui/icons'

export function Modal({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  const patch = useStore((s) => s.patch)
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-mudwall/75 p-4 backdrop-blur-[2px]"
      onPointerDown={(e) => { if (e.target === e.currentTarget) patch({ modal: 'none' }) }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[88vh] w-full flex-col overflow-hidden rounded-3xl bg-bone shadow-panel ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4">
          <h2 className="font-display text-[19px] font-bold">{title}</h2>
          <button
            aria-label="Close"
            onClick={() => patch({ modal: 'none' })}
            className="flex h-9 w-9 items-center justify-center rounded-full text-inksoft hover:bg-bonedeep"
          >
            <IconClose size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}
