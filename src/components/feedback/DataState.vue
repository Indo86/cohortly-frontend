<script setup>
import EmptyState from './EmptyState.vue'
import ErrorState from './ErrorState.vue'
import LoadingState from './LoadingState.vue'

// One wrapper so every data view handles the same four situations the same way:
// loading, error (with retry), empty (with guidance and an action), and content.
// `subject` ("your courses") lets the error say what could not be loaded.
defineProps({
  pending: { type: Boolean, default: false },
  error: { type: Object, default: null },
  empty: { type: Boolean, default: false },
  subject: { type: String, default: '' },
  loadingLabel: { type: String, default: 'Loading…' },
  emptyTitle: { type: String, default: 'Nothing here yet' },
  emptyDescription: { type: String, default: '' },
  emptyIcon: { type: String, default: 'document' },
})

defineEmits(['retry'])
</script>

<template>
  <LoadingState v-if="pending" :label="loadingLabel" />
  <ErrorState v-else-if="error" :error="error" :subject="subject" @retry="$emit('retry')" />
  <EmptyState v-else-if="empty" :title="emptyTitle" :description="emptyDescription" :icon="emptyIcon">
    <slot name="empty-actions" />
  </EmptyState>
  <slot v-else />
</template>
