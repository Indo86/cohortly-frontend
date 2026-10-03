/** @type {import('tailwindcss').Config} */

// Design tokens. The colour values live in src/style.css as CSS variables (one place to retune
// the palette); this file gives them utility names. Pages and components use the SEMANTIC
// names (surface, line, ink, success...) and never raw palette steps for meaning.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // one brand colour: actions, links, focus and the active navigation state
        primary: { DEFAULT: token('primary'), hover: token('primary-hover'), soft: token('primary-soft'), strong: token('primary-strong') },
        brand: { 50: token('primary-faint'), 100: token('primary-soft'), 600: token('primary'), 700: token('primary-hover'), 800: token('primary-strong') },

        // neutral scale
        canvas: token('canvas'), // the page background
        surface: { DEFAULT: token('surface'), muted: token('surface-muted') },
        line: { DEFAULT: token('line'), control: token('line-control') },
        ink: { DEFAULT: token('ink'), soft: token('ink-soft'), muted: token('ink-muted') },

        // semantic colours: DEFAULT = text/icon/fill on light surfaces, soft = tinted background,
        // strong = text on the tinted background
        success: { DEFAULT: token('success'), soft: token('success-soft'), strong: token('success-strong') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft'), strong: token('warning-strong') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft'), strong: token('danger-strong') },
        info: { DEFAULT: token('primary'), soft: token('primary-soft'), strong: token('primary-strong') },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      // radius scale: control (inputs, buttons), card (panels, list items), overlay (dialogs)
      borderRadius: { control: '0.5rem', card: '0.75rem', overlay: '1rem' },
      // shadow scale: cards are barely lifted, only overlays have real depth
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        overlay: '0 10px 30px -8px rgb(15 23 42 / 0.30)',
      },
      // layout
      maxWidth: { content: '72rem', form: '42rem', reading: '44rem' },
      width: { sidebar: '16rem' },
      height: { header: '3.5rem' },
      gridTemplateColumns: { shell: '16rem minmax(0, 1fr)' },
    },
  },
  plugins: [],
}
