<script setup>
import { computed } from 'vue'

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
  <span class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5" :class="classes">
    <slot />
  </span>
</template>
