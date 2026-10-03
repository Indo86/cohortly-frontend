<script setup>
import { computed } from 'vue'
import { R } from '@/constants/routes.js'
import { ErrorKind } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import DataState from '@/components/feedback/DataState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'

// DataState for Student pages, plus the one answer the student must be told plainly: a 404.
// The backend answers 404 for a draft, unpublished, unenrolled or removed course/lesson and
// deliberately does not say which, so neither does this page. A 404 never touches the session.
const props = defineProps({
  pending: { type: Boolean, default: false },
  error: { type: Object, default: null },
  empty: { type: Boolean, default: false },
  subject: { type: String, default: '' },
  loadingLabel: { type: String, default: 'Loading…' },
  emptyTitle: { type: String, default: 'Nothing here yet' },
  emptyDescription: { type: String, default: '' },
  unavailableTitle: { type: String, default: 'This is no longer available' },
  unavailableDescription: { type: String, default: 'It may have been unpublished or removed. Your other courses are not affected.' },
})

defineEmits(['retry'])

const unavailable = computed(() => !props.pending && props.error?.kind === ErrorKind.NOT_FOUND)
</script>

<template>
  <EmptyState v-if="unavailable" :title="unavailableTitle" :description="unavailableDescription">
    <AppButton variant="secondary" :to="{ name: R.STUDENT_COURSES }">Back to My Courses</AppButton>
  </EmptyState>
  <DataState
    v-else
    :pending="pending"
    :error="error"
    :empty="empty"
    :subject="subject"
    :loading-label="loadingLabel"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    @retry="$emit('retry')"
  >
    <template #empty-actions><slot name="empty-actions" /></template>
    <slot />
  </DataState>
</template>
