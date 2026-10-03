<script setup>
// Decorative: the surrounding element (button, LoadingState) carries the accessible text.
defineProps({
  size: { type: String, default: 'md' },
})
</script>

<template>
  <svg
    class="animate-spin"
    :class="size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
</template>
