<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'

// Inline message for form and page level problems and confirmations (preferred over toasts for
// anything the user must read or act on). The icon repeats the tone so it is not colour alone.
const props = defineProps({
  tone: { type: String, default: 'info' }, // info | success | warning | danger
  title: { type: String, default: '' },
})

const TONES = {
  info: 'border-primary/25 bg-primary-faint text-primary-strong',
  success: 'border-success/30 bg-success-soft/60 text-success-strong',
  warning: 'border-warning/30 bg-warning-soft/70 text-warning-strong',
  danger: 'border-danger/30 bg-danger-soft/70 text-danger-strong',
}
const ICONS = { info: 'info', success: 'check-circle', warning: 'warning', danger: 'x-circle' }

const classes = computed(() => TONES[props.tone] ?? TONES.info)
const icon = computed(() => ICONS[props.tone] ?? ICONS.info)
// problems are announced immediately, the rest politely
const role = computed(() => (props.tone === 'danger' ? 'alert' : 'status'))
</script>

<template>
  <div class="flex gap-3 rounded-control border px-4 py-3 text-sm leading-6" :class="classes" :role="role">
    <AppIcon :name="icon" class="mt-0.5 h-5 w-5 shrink-0" />
    <div class="min-w-0">
      <p v-if="title" class="font-semibold">{{ title }}</p>
      <div>
        <slot />
      </div>
    </div>
  </div>
</template>
