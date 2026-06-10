import { useStore } from '../../state/store'
import { IconClose } from '../ui/icons'

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border-l-4 bg-bone px-4 py-2.5
            text-[12.5px] font-semibold text-ink shadow-panel ${
            t.kind === 'error' ? 'border-clayred' : t.kind === 'success' ? 'border-sage' : 'border-brass'
          }`}
        >
          <span>{t.text}</span>
          <button
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded-full p-1 text-inksoft hover:text-ink"
          >
            <IconClose size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
