import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import plugin from 'tailwindcss/plugin.js'

// Unmodified approved source snapshot. CSS variables and utilities share this source.
const tokens = JSON.parse(readFileSync(resolve(process.cwd(), 'src/design/tokens.json'), 'utf8'))
const colors = Object.fromEntries(tokens.color.tokens.map(({ name, value }) => [name, value]))
const radius = Object.fromEntries(tokens.radius.tokens.map(({ name, value }) => [name.replace('radius-', ''), value]))
const shadows = Object.fromEntries(tokens.shadow.tokens.map(({ name, value }) => [name.replace('shadow-', ''), value]))
const variables = Object.fromEntries([
  ...tokens.color.tokens, ...tokens.spacing.tokens, ...tokens.radius.tokens,
  ...tokens.shadow.tokens, ...tokens.size.tokens,
].map(({ name, value }) => [`--${name}`, value]))
Object.entries(tokens.type.families).forEach(([name, value]) => { variables[`--font-${name}`] = value })

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        ...colors,
        // Existing semantic names remain aliases to approved tokens during this refactor.
        canvas: colors.paper, 'surface-muted': colors['paper-sunk'],
        'line-control': colors['line-strong'], 'ink-soft': colors['ink-2'], 'ink-muted': colors['ink-3'],
        'primary-hover': colors['primary-dark'], 'primary-strong': colors['primary-dark'],
        'primary-soft': colors['primary-tint'], 'primary-faint': colors['primary-tint'],
        brand: { 50: colors['primary-tint'], 100: colors['primary-tint'], 600: colors.primary, 700: colors['primary-dark'], 800: colors['primary-dark'] },
        'success-soft': colors['success-tint'], 'success-strong': colors.success,
        'warning-soft': colors['warning-tint'], 'warning-strong': colors.warning,
        'danger-soft': colors['danger-tint'], 'danger-strong': colors.danger,
        info: { DEFAULT: colors.primary, soft: colors['primary-tint'], strong: colors['primary-dark'] },
      },
      fontFamily: {
        display: ['Newsreader', 'Iowan Old Style', 'Georgia', 'serif'],
        sans: ['Instrument Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        display: ['4rem', { lineHeight: '1', fontWeight: '500', letterSpacing: '-0.02em' }],
        'page-title': ['2.5rem', { lineHeight: '2.75rem', fontWeight: '500', letterSpacing: '-0.015em' }],
        'section-heading': ['1.5rem', { lineHeight: '1.875rem', fontWeight: '600' }],
        metric: ['3rem', { lineHeight: '1', fontWeight: '500', letterSpacing: '-0.02em' }],
        'card-title': ['1.0625rem', '1.5rem'],
        body: ['0.9375rem', '1.5rem'], metadata: ['0.8125rem', '1.125rem'],
        'reader-title': ['2.75rem', { lineHeight: '3.125rem', fontWeight: '500' }],
        'reader-body': ['1.25rem', '2.125rem'],
        code: ['0.8125rem', '1.25rem'],
      },
      borderRadius: { ...radius, control: radius.sm, card: radius.md, overlay: radius.md },
      boxShadow: { ...shadows, card: shadows['1'], overlay: shadows['2'] },
      maxWidth: { content: '75rem', form: '42rem', reading: '68ch', assistant: '22.5rem' },
      width: { sidebar: '15.5rem', rail: '4.5rem', assistant: '22.5rem' },
      height: { header: '4rem' },
      gridTemplateColumns: { shell: '15.5rem minmax(0, 1fr)', focus: '4.5rem minmax(0, 1fr)' },
    },
  },
  plugins: [plugin(({ addBase }) => addBase({ ':root': variables }))],
}
