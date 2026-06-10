interface IconProps { size?: number }

function svg(path: React.ReactNode, size = 18) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {path}
    </svg>
  )
}

export const IconSelect = ({ size }: IconProps) => svg(<path d="M5 3l14 8-6.5 1.5L9 19z" />, size)
export const IconFill = ({ size }: IconProps) =>
  svg(<><path d="M13 3L5.5 10.5a2 2 0 0 0 0 2.8l4.2 4.2a2 2 0 0 0 2.8 0L20 10z" /><path d="M4 20.5c.8-1.4 2-2.2 2-3.7" /></>, size)
export const IconPen = ({ size }: IconProps) =>
  svg(<><path d="M4 20l3.5-.8L19 7.7a2 2 0 0 0-2.8-2.8L4.7 16.4z" /><path d="M13.5 6.5l3.9 3.9" /></>, size)
export const IconEraser = ({ size }: IconProps) =>
  svg(<><path d="M7 20h13" /><path d="M5.5 14.5l8-8a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L13 19l-5 .5-2.5-2.2a2 2 0 0 1 0-2.8z" /></>, size)
export const IconDropper = ({ size }: IconProps) =>
  svg(<><path d="M12 11l-7 7-.5 3 3-.5 7-7" /><path d="M14 5l5 5M13 4l1.5-1.5a2.5 2.5 0 0 1 3.5 0l3.5 3.5a2.5 2.5 0 0 1 0 3.5L20 11" /></>, size)
export const IconMirror = ({ size }: IconProps) =>
  svg(<><circle cx="12" cy="12" r="8" /><path d="M8.5 8.5a5 5 0 0 1 4-1.4" /></>, size)
export const IconUndo = ({ size }: IconProps) => svg(<><path d="M8 5L4 9l4 4" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>, size)
export const IconRedo = ({ size }: IconProps) => svg(<><path d="M16 5l4 4-4 4" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></>, size)
export const IconExport = ({ size }: IconProps) =>
  svg(<><path d="M12 15V4" /><path d="M8 8l4-4 4 4" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>, size)
export const IconOverlay = ({ size }: IconProps) =>
  svg(<><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.6" /></>, size)
export const IconSweep = ({ size }: IconProps) =>
  svg(<><circle cx="12" cy="12" r="8" /><path d="M6 9l3-3M9 17L17 9" /></>, size)
export const IconClose = ({ size }: IconProps) => svg(<path d="M6 6l12 12M18 6L6 18" />, size)
export const IconPlus = ({ size }: IconProps) => svg(<path d="M12 5v14M5 12h14" />, size)
export const IconTrash = ({ size }: IconProps) =>
  svg(<><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6.5 7l1 13h9l1-13" /></>, size)
export const IconLock = ({ size }: IconProps) =>
  svg(<><rect x="5.5" y="11" width="13" height="9" rx="2" /><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></>, size)
export const IconUnlock = ({ size }: IconProps) =>
  svg(<><rect x="5.5" y="11" width="13" height="9" rx="2" /><path d="M8.5 11V8a3.5 3.5 0 0 1 6.8-1" /></>, size)
export const IconEye = ({ size }: IconProps) =>
  svg(<><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.6" /></>, size)
export const IconEyeOff = ({ size }: IconProps) =>
  svg(<><path d="M4 4l16 16" /><path d="M9.9 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 6.5 10 6.5a17 17 0 0 1-3 3.8M6.2 6.7A16 16 0 0 0 2 11.5S5.5 18 12 18a10 10 0 0 0 4-.8" /></>, size)
export const IconRotate = ({ size }: IconProps) =>
  svg(<><path d="M20 5v5h-5" /><path d="M20 10a8 8 0 1 0 2 6" /></>, size)
export const IconWall = ({ size }: IconProps) =>
  svg(<><rect x="4" y="4" width="16" height="13" rx="1" /><circle cx="12" cy="10.5" r="3.5" /><path d="M2 20h20" /></>, size)
export const IconCompare = ({ size }: IconProps) =>
  svg(<><rect x="3" y="5" width="7.5" height="14" rx="1" /><rect x="13.5" y="5" width="7.5" height="14" rx="1" /></>, size)
export const IconPrint = ({ size }: IconProps) =>
  svg(<><path d="M7 8V4h10v4" /><rect x="4" y="8" width="16" height="8" rx="1.5" /><path d="M7 14h10v6H7z" /></>, size)
export const IconHelp = ({ size }: IconProps) =>
  svg(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.6 2.6 0 0 1 5.1.6c0 1.7-2.6 2.1-2.6 3.6" /><circle cx="12" cy="17" r="0.4" fill="currentColor" /></>, size)
export const IconShuffle = ({ size }: IconProps) =>
  svg(<><path d="M3 7h3.5c5 0 6 10 11 10H21" /><path d="M3 17h3.5c2 0 3.3-1.6 4.4-3.4M13.2 10.2C14.3 8.5 15.6 7 17.5 7H21" /><path d="M18.5 4.5L21 7l-2.5 2.5M18.5 14.5L21 17l-2.5 2.5" /></>, size)
export const IconRing = ({ size }: IconProps) =>
  svg(<><circle cx="12" cy="12" r="7.5" strokeDasharray="2.5 3.4" /><circle cx="12" cy="4.5" r="1.6" /><circle cx="19.5" cy="12" r="1.6" /><circle cx="12" cy="19.5" r="1.6" /><circle cx="4.5" cy="12" r="1.6" /></>, size)
export const IconImage = ({ size }: IconProps) =>
  svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4 17l5-4 3 2.5 4-3.5 4 4" /></>, size)
export const IconBoard = ({ size }: IconProps) => svg(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /></>, size)
