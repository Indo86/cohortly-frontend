<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

// A short status or category label. The WORD carries the meaning; the tone only reinforces it
// (every tone/foreground pair is >= 4.5:1).
const props = defineProps({
  tone: { type: String, default: 'neutral' }, // neutral | success | warning | danger | info
})

const TONES = {
  neutral: 'bg-surface-muted text-ink-soft',
  success: 'bg-success-soft text-success-strong',
  warning: 'bg-warning-soft text-warning-strong',
  danger: 'bg-danger-soft text-danger-strong',
  info: 'bg-primary-soft text-primary-strong',
}

const classes = computed(() => TONES[props.tone] ?? TONES.neutral)
</script>

<template>
  <span class="inline-flex items-center gap-1 whitespace-nowrap rounded-xs px-2 py-0.5 text-metadata font-semibold leading-5" :class="classes">
    <AppIcon :name="({ success: 'check-circle', warning: 'warning', danger: 'x-circle', info: 'info' })[tone] ?? 'circle'" class="h-3 w-3 shrink-0" />
    <slot />
  </span>
</template>
