<script setup>
import { computed } from 'vue'

// A small fixed icon set (outline style, 24px grid). Icons are decorative: the text next to
// them carries the meaning, so they are always aria-hidden.
const props = defineProps({
  name: { type: String, required: true },
  class: { type: String, default: 'h-5 w-5' },
})

const PATHS = {
  dashboard:
    'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
  courses:
    'M12 6.25v13m0-13C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5c1.75 0 3.33.48 4.5 1.25v13c-1.17-.77-2.75-1.25-4.5-1.25s-3.33.48-4.5 1.25',
  students:
    'M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2c0-.66.13-1.28.36-1.86m0 0a5 5 0 019.28 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  billing: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  check: 'M5 13l4 4L19 7',
  'check-circle': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  circle: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  warning:
    'M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z',
  'x-circle': 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  plus: 'M12 5v14M5 12h14',
  play: 'M14.75 12L10 9.25v5.5L14.75 12zM21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.59a1 1 0 01.7.29l5.42 5.42a1 1 0 01.29.7V19a2 2 0 01-2 2z',
  'arrow-left': 'M10 19l-7-7m0 0l7-7m-7 7h18',
  'arrow-right': 'M14 5l7 7m0 0l-7 7m7-7H3',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  close: 'M6 18L18 6M6 6l12 12',
  menu: 'M4 7h16M4 12h16M4 17h16',
  certificate:
    'M9 12l2 2 4-4M7.84 4.7a3.42 3.42 0 001.95-.8 3.42 3.42 0 014.44 0 3.42 3.42 0 001.95.8 3.42 3.42 0 013.14 3.14 3.42 3.42 0 00.8 1.95 3.42 3.42 0 010 4.44 3.42 3.42 0 00-.8 1.95 3.42 3.42 0 01-3.14 3.14 3.42 3.42 0 00-1.95.8 3.42 3.42 0 01-4.44 0 3.42 3.42 0 00-1.95-.8 3.42 3.42 0 01-3.14-3.14 3.42 3.42 0 00-.8-1.95 3.42 3.42 0 010-4.44 3.42 3.42 0 00.8-1.95A3.42 3.42 0 017.84 4.7z',
  quiz:
    'M8.23 9c.55-1.17 2.03-2 3.77-2 2.21 0 4 1.34 4 3 0 1.4-1.28 2.58-3 2.91-.54.1-1 .54-1 1.09m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  print:
    'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z',
  sparkles: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.29 6.86L21 12l-5.71 2.14L13 21l-2.29-6.86L5 12l5.71-2.14L13 3z',
  trash: 'M19 7l-.87 12.14A2 2 0 0116.14 21H7.86a2 2 0 01-1.99-1.86L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
}

const path = computed(() => PATHS[props.name] ?? PATHS.info)
</script>

<template>
  <svg :class="props.class" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="path" />
  </svg>
</template>
