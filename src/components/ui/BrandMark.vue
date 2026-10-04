<script setup>
import { APP_NAME } from '@/constants/app.js'
defineProps({
  size: { type: String, default: 'md' },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <span class="inline-flex items-center gap-3 font-display font-medium tracking-tight" :class="size === 'lg' ? 'text-3xl' : 'text-2xl'">
    <svg class="h-6 w-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 19L12 11H20" fill="none" stroke="currentColor" stroke-width="1.6" />
      <circle cx="4" cy="19" r="2.5" fill="currentColor" />
      <circle cx="12" cy="11" r="2.5" fill="currentColor" />
      <circle cx="20" cy="11" r="3" fill="var(--accent)" />
    </svg>
    <span :class="compact ? 'sr-only' : ''">{{ APP_NAME }}</span>
  </span>
</template>
