<script setup>
import { dismissToast, toasts } from '@/composables/useToast.js'
import AppIcon from '@/components/ui/AppIcon.vue'

// The live region for toasts. It is always in the DOM (so screen readers register it before
// the first message) and sits above the content, bottom-centre on phones and bottom-right on
// larger screens. It never takes focus.
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end print:hidden"
    role="status"
    aria-live="polite"
    aria-relevant="additions"
    data-testid="toast-region"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-control border border-success/30 bg-surface px-4 py-3 text-sm text-ink shadow-overlay"
    >
      <AppIcon name="check-circle" class="h-5 w-5 shrink-0 text-success" />
      <p class="min-w-0 flex-1">{{ toast.message }}</p>
      <button
        type="button"
        class="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-muted hover:bg-surface-muted sm:h-9 sm:w-9"
        aria-label="Dismiss notification"
        @click="dismissToast(toast.id)"
      >
        <AppIcon name="close" class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
