import { finishCoach, loadDemo } from '../../state/actions/project'
import { useStore } from '../../state/store'
import { BrassButton, QuietButton } from '../ui/primitives'

const STEPS = [
  {
    title: 'Upload',
    body: 'Start with a photo of your unpainted board — or press "Try the demo" to play right away. Templates (top center) work with zero setup.',
  },
  {
    title: 'Boundaries',
    body: 'Lippan ridges divide the board into regions. Check the orange overlay: gaps let paint leak. Seal them with the Boundary pen (B); erase noise with E.',
  },
  {
    title: 'Paint',
    body: 'Add your real paints in the Palette tab — photograph your jars and tap each one. Then tap any region with the Paint tool (F). The clay texture stays visible.',
  },
  {
    title: 'Mirrors',
    body: 'Open the Mirrors tab and add a ring — 12 mirrors facing center is the classic move. Toggle the light sweep in the header to watch them catch the sun.',
  },
]

export function CoachMarks() {
  const step = useStore((s) => s.coachStep)
  const patch = useStore((s) => s.patch)
  if (step < 0 || step >= STEPS.length) return null
  const s = STEPS[step]
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-end p-5">
      <div className="pointer-events-auto w-full max-w-sm rounded-3xl bg-bone p-5 shadow-panel">
        <div className="mb-3 flex items-center gap-2">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i === step ? 'bg-brass' : 'bg-bonedeep'}`} />
          ))}
          <span className="label-caps ml-auto">{step + 1} of {STEPS.length}</span>
        </div>
        <h3 className="font-display text-[19px] font-bold">{s.title}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-inksoft">{s.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={finishCoach} className="text-[12px] font-semibold text-inksoft underline-offset-4 hover:underline">
            Skip tour
          </button>
          <span className="flex gap-2">
            {step === 0 && (
              <QuietButton onClick={() => { finishCoach(); void loadDemo() }}>Try the demo</QuietButton>
            )}
            <BrassButton onClick={() => (step === STEPS.length - 1 ? finishCoach() : patch({ coachStep: step + 1 }))}>
              {step === STEPS.length - 1 ? 'Start creating' : 'Next'}
            </BrassButton>
          </span>
        </div>
      </div>
    </div>
  )
}
