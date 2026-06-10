# Lippan Studio — design plan

## Concept

Traditional Lippan lives on the mud walls of Kutchi bhungas: deep earthen brown plaster, bone-white
clay relief, and mirror sparkle. The interface takes that literally — **the app chrome is the mud
wall; the artwork is the lippan piece mounted on it.** The stage is a deep warm umber wall with a
barely-there plaster grain; the round artwork sits on it like a lit gallery piece with a soft
realistic shadow. Panels are quiet bone surfaces written in warm-brown ink. One brass accent is
reserved for the primary action and active states, so light pastels and mirror glints stay the
loudest thing on screen.

## Tokens

| Token        | Hex       | Role                                                        |
| ------------ | --------- | ----------------------------------------------------------- |
| `mudwall`    | `#3F2D20` | Stage backdrop — deep warm umber, never gray or black        |
| `mud`        | `#5A4332` | Raised chrome on the wall (header, rail), hover shades       |
| `bone`       | `#F6F0E3` | Panel surfaces, cards                                        |
| `bonedeep`   | `#EAE0CC` | Inset wells, secondary surfaces, dividers                    |
| `ink`        | `#3A2B1E` | Text on bone; warm brown, never neutral gray                 |
| `brass`      | `#A9852F` | The one accent: primary buttons, active tool, focus rings    |
| `brasslight` | `#D9B45C` | Brass hover / metallic gradient highlight                    |
| `sage`       | `#7E9670` | Success states only                                          |
| `clayred`    | `#A8472F` | Errors and destructive actions — a fired-clay red            |

No blues, no purples, no default Tailwind palette anywhere. Tailwind's palette is disabled; these
tokens are the entire color vocabulary, declared once as CSS custom properties and mapped into
Tailwind so every component derives from them.

## Type

- **Eczar** (display, 600/700) — wordmark and section titles only. Designed in India for
  Devanagari + Latin; its sharp, folk-modern terminals suit Kutch far better than the generic
  Playfair/Fraunces look.
- **Mulish** (400/600/700) — all UI text. Clean humanist sans, friendly at small sizes.
- **IBM Plex Mono** (500) — tabular numbers: counts, millimetres, percentages, the mirror chip.

Scale: 11px small-caps labels with `+0.08em` tracking · 13px UI body · 15px panel titles ·
20–28px Eczar display. Sentence case everywhere.

## Layout

Three-zone studio. A slim 56px icon tool rail on the left (tooltips, single-key shortcuts), the
stage in the center on the mud wall (always wins space; wheel/pinch zoom and drag pan), and a
320px tabbed properties panel on the right — Palette / Mirrors / Variants — on bone. The header is
a thin strip of raised mud carrying the wordmark, mode switch, undo/redo and export. Under 900px
the right panel becomes a bottom sheet and the rail compresses; hit targets stay ≥ 44px.

## Signature element

**The mirror circle.** Round swatches everywhere (paint jars, not squares), a round mirror-glint
loading indicator (a rotating specular streak on a silvered disc), and the F8 light sweep as the
single moment of theatre. Boldness is spent there; everything else is disciplined: 150–250ms
eases, a swatch lifts on hover, a fill ripples once outward from the tap point, a mirror glints
once when placed.

## Self-critique (required pass)

First draft used a near-black `#241A12` stage and a generic gold `#C9A227`. Critique: near-black
is the default "pro editor" look — any photo tool could ship it — and the gold read as bootstrap
warning-yellow. **Changed:** stage lightened to true umber `#3F2D20` with a plaster grain so it
reads as a mud wall rather than a void, and the accent moved to a quieter, greener brass
`#A9852F` with `#D9B45C` reserved for gradient highlights — closer to the brass bells hung in
Kutchi homes than to "gold accent." Also dropped a planned hairline-border "broadsheet" panel
style (explicitly a generic look) in favour of soft shadow-raised bone cards, like plaster relief.
