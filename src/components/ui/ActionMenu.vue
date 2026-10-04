<script setup>
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'
defineProps({ label: { type: String, default: 'More actions' } })
const disclosure = ref(null)
const close = () => { disclosure.value.open = false; disclosure.value.querySelector('summary')?.focus() }
</script>
<template>
  <details ref="disclosure" class="action-menu relative" @keydown.esc.stop="close" @focusout="(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !event.relatedTarget?.closest?.('[role=dialog]')) disclosure.open = false }">
    <summary class="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-sm text-ink-2 hover:bg-paper-sunk" :aria-label="label" :title="label"><AppIcon name="menu" class="h-5 w-5" /></summary>
    <div class="absolute right-0 z-20 flex min-w-40 flex-col items-stretch gap-1 rounded-md border border-line bg-surface-raised p-2 shadow-2"><slot /></div>
  </details>
</template>
