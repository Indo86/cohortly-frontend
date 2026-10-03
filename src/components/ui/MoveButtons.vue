<script setup>
// Reordering with plain buttons (no drag and drop): fully keyboard and screen-reader
// operable, and the backend stays the only authority on the final order. The two buttons are
// one visual group and carry the item's name, so each is distinguishable out of context.
// Touch targets are 44px on small screens and compact (36px) from the sm breakpoint up.
defineProps({
  name: { type: String, required: true }, // e.g. 'section "Basics"'
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['move'])

const classes =
  'inline-flex h-11 w-11 items-center justify-center text-ink-soft transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-ink-muted disabled:opacity-40 disabled:hover:bg-transparent sm:h-9 sm:w-9'
</script>

<template>
  <div class="inline-flex divide-x divide-line overflow-hidden rounded-control border border-line-control bg-surface" role="group" :aria-label="`Reorder ${name}`">
    <button type="button" :class="classes" :disabled="busy || index === 0" :aria-label="`Move ${name} up`" @click="emit('move', -1)">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
    <button type="button" :class="classes" :disabled="busy || index === total - 1" :aria-label="`Move ${name} down`" @click="emit('move', 1)">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>
</template>
