import { useRef, useState } from 'react'
import { handlePhotoFile } from '../../state/actions/photo'
import { loadDemo } from '../../state/actions/project'
import { useStore } from '../../state/store'
import { BrassButton } from '../ui/primitives'

export function UploadView() {
  const patch = useStore((s) => s.patch)
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const onFiles = (files: FileList | null) => {
    if (files && files[0]) void handlePhotoFile(files[0])
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="flex min-h-full items-center justify-center">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files) }}
        className={`flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border-2 border-dashed p-6 text-center transition-colors duration-200 sm:gap-5 sm:p-10
          ${over ? 'border-brasslight bg-bone/10' : 'border-bone/25'}`}
      >
        {/* an unpainted board, waiting */}
        <div className="relative h-20 w-20 rounded-full bg-bonedeep shadow-piece sm:h-28 sm:w-28">
          <div className="absolute inset-3 rounded-full border-[3px] border-bone" />
          <div className="absolute inset-[34%] rounded-full border-[3px] border-bone" />
        </div>
        <div>
          <h2 className="font-display text-[20px] font-bold text-bone sm:text-[22px]">Bring your board to the studio</h2>
          <p className="mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-bone/70">
            Drop a photo of your unpainted clay relief here — JPG, PNG or WebP.
            HEIC photos need converting to JPG first.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <BrassButton onClick={() => inputRef.current?.click()}>Choose a photo</BrassButton>
          <button
            onClick={() => void loadDemo()}
            className="inline-flex min-h-[36px] items-center rounded-full border border-bone/40 px-4 py-1.5 text-[12px] font-bold
              text-bone transition-colors duration-200 hover:border-brasslight hover:text-brasslight"
          >
            Try the demo
          </button>
        </div>
        <button
          onClick={() => patch({ mode: 'template' })}
          className="text-[12px] font-semibold text-brasslight underline-offset-4 hover:underline"
        >
          Or start instantly with a template →
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          data-testid="photo-input"
          onChange={(e) => { onFiles(e.target.files); e.target.value = '' }}
        />
      </div>
      </div>
    </div>
  )
}
