import { activeHistory, redo, undo } from '../../state/actions/undo'
import { useStore } from '../../state/store'
import { Segmented } from '../ui/primitives'
import { IconExport, IconHelp, IconRedo, IconSweep, IconUndo } from '../ui/icons'

function HeadIconButton(props: {
  title: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  testid?: string
}) {
  return (
    <button
      title={props.title}
      aria-label={props.title}
      data-testid={props.testid}
      disabled={props.disabled}
      onClick={props.onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200
        ${props.active ? 'bg-brass text-bone' : 'text-bone/85 hover:bg-bone/15'}
        disabled:cursor-not-allowed disabled:opacity-30`}
    >
      {props.children}
    </button>
  )
}

export function Header() {
  const mode = useStore((s) => s.mode)
  const projectName = useStore((s) => s.projectName)
  const lightSweep = useStore((s) => s.lightSweep)
  useStore((s) => s.historyVersion)
  const patch = useStore((s) => s.patch)
  const history = activeHistory()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-bone/10 bg-mud px-3 shadow-panel sm:px-4">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[20px] font-bold leading-none text-bone">Lippan</span>
        <span className="font-display text-[20px] font-semibold leading-none text-brasslight">Studio</span>
      </div>
      <input
        value={projectName}
        onChange={(e) => patch({ projectName: e.target.value })}
        aria-label="Project name"
        className="hidden w-40 rounded-full border border-bone/15 bg-transparent px-3 py-1.5 text-[12px] font-semibold
          text-bone/90 placeholder:text-bone/40 focus:border-brass md:block"
        placeholder="Project name"
      />
      <div className="mx-auto">
        <Segmented
          value={mode}
          onChange={(m) => patch({ mode: m, selectedMirrorIds: [], selectedRegion: null })}
          options={[
            { id: 'photo', label: 'My photo', title: 'Photo Mode — paint your own board' },
            { id: 'template', label: 'Templates', title: 'Template Mode — instant play' },
          ]}
        />
      </div>
      <div className="flex items-center gap-0.5">
        <HeadIconButton title="Undo (Ctrl+Z)" testid="undo" onClick={undo} disabled={!history.canUndo}>
          <IconUndo />
        </HeadIconButton>
        <HeadIconButton title="Redo (Shift+Ctrl+Z)" testid="redo" onClick={redo} disabled={!history.canRedo}>
          <IconRedo />
        </HeadIconButton>
        <HeadIconButton
          title={lightSweep ? 'Light sweep off' : 'Light sweep — watch the mirrors catch light'}
          onClick={() => patch({ lightSweep: !lightSweep })}
          active={lightSweep}
        >
          <IconSweep />
        </HeadIconButton>
        <HeadIconButton title="Export…" testid="export-open" onClick={() => patch({ modal: 'export' })}>
          <IconExport />
        </HeadIconButton>
        <HeadIconButton title="Shortcuts (?)" onClick={() => patch({ modal: 'shortcuts' })}>
          <IconHelp />
        </HeadIconButton>
      </div>
    </header>
  )
}
