<script setup>
import { APP_NAME } from '@/constants/app.js'

// The product mark: a rounded square with an open-book "C" monogram, then the name. The name
// is text (the SVG is decorative), so a link around it is named by the product name.
defineProps({
  size: { type: String, default: 'md' }, // md | lg
})
</script>

<template>
  <span class="inline-flex items-center gap-2.5 font-bold tracking-tight text-ink" :class="size === 'lg' ? 'text-2xl' : 'text-xl'">
    <svg :class="size === 'lg' ? 'h-9 w-9' : 'h-8 w-8'" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="rgb(var(--c-primary))" />
      <path d="M21.5 11.2A6.4 6.4 0 1021.5 20.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" />
      <circle cx="21.2" cy="16" r="1.7" fill="#fff" />
    </svg>
    {{ APP_NAME }}
  </span>
</template>
