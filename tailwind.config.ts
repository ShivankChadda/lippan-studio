import type { Config } from 'tailwindcss'

// Every color/type decision derives from DESIGN.md tokens (CSS custom properties in index.css).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      mudwall: 'var(--mudwall)',
      mud: 'var(--mud)',
      bone: 'var(--bone)',
      bonedeep: 'var(--bonedeep)',
      ink: 'var(--ink)',
      inksoft: 'var(--ink-soft)',
      brass: 'var(--brass)',
      brasslight: 'var(--brasslight)',
      sage: 'var(--sage)',
      clayred: 'var(--clayred)',
      white: '#FFFFFF',
    },
    fontFamily: {
      display: ['Eczar', 'serif'],
      sans: ['Mulish', 'system-ui', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'monospace'],
    },
    extend: {
      boxShadow: {
        panel: '0 1px 2px rgba(42,28,16,.18), 0 6px 24px rgba(42,28,16,.22)',
        piece: '0 12px 40px rgba(20,10,4,.55), 0 3px 10px rgba(20,10,4,.4)',
        swatch: '0 1px 3px rgba(42,28,16,.35)',
      },
      letterSpacing: { label: '0.08em' },
    },
  },
  plugins: [],
} satisfies Config
