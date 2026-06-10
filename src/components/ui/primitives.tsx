import { type ReactNode } from 'react'

export function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  onCommit?: () => void
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between">
        <span className="label-caps">{props.label}</span>
        <span className="font-mono text-[11px] font-medium text-ink">
          {props.value}{props.unit ?? ''}
        </span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        onPointerUp={props.onCommit}
        onKeyUp={props.onCommit}
        aria-label={props.label}
      />
    </label>
  )
}

export function Segmented<T extends string>(props: {
  options: { id: T; label: ReactNode; title?: string }[]
  value: T
  onChange: (v: T) => void
  small?: boolean
}) {
  return (
    <div className="inline-flex rounded-full bg-bonedeep p-0.5 shadow-swatch">
      {props.options.map((o) => (
        <button
          key={o.id}
          title={o.title}
          onClick={() => props.onChange(o.id)}
          className={`rounded-full font-semibold transition-colors duration-200 ${
            props.small ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-[12px]'
          } ${props.value === o.id ? 'bg-brass text-bone shadow-swatch' : 'text-inksoft hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function BrassButton(props: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  full?: boolean
  title?: string
}) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      className={`inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-full bg-brass px-4 py-1.5 text-[12px]
        font-bold text-bone shadow-swatch transition-all duration-200 hover:bg-brasslight hover:text-ink
        disabled:cursor-not-allowed disabled:opacity-40 ${props.full ? 'w-full' : ''}`}
    >
      {props.children}
    </button>
  )
}

export function QuietButton(props: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
  full?: boolean
}) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      className={`inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold
        transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${props.full ? 'w-full' : ''} ${
        props.danger
          ? 'border-clayred/40 text-clayred hover:bg-clayred hover:text-bone'
          : 'border-inksoft/30 text-ink hover:border-brass hover:text-brass'
      }`}
    >
      {props.children}
    </button>
  )
}

export function GlintSpinner({ size = 36, label }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2" role="status" aria-live="polite">
      <div className="glint-spinner" style={{ width: size, height: size }} />
      {label && <span className="text-[12px] font-semibold text-bone/90">{label}</span>}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-display text-[15px] font-semibold text-ink">{children}</h3>
}
