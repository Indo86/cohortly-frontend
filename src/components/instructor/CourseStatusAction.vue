<script setup>
import { computed, ref } from 'vue'
import { useSetCourseStatus } from '@/composables/instructorMutations.js'
import { normalizeError } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// Publish / unpublish. Nothing is shown as changed until the backend confirms: the badge
// and button follow the refetched course. Unpublishing asks first because students lose
// access immediately (their progress is kept).
const props = defineProps({
  courseId: { type: String, required: true },
  status: { type: String, required: true }, // draft | published
  courseName: { type: String, default: 'this course' },
})

const courseId = computed(() => props.courseId)
const mutation = useSetCourseStatus(courseId)
const confirmOpen = ref(false)
const message = ref('')

const published = computed(() => props.status === 'published')

const describe = (error) => {
  if (error.code === 'COURSE_NOT_PUBLISHABLE') return 'Add at least one lesson before publishing.'

  // the backend lists what is missing in the final quiz (error.problems is not part of ApiError, so
  // the message stays generic and points to the Quiz tab, which shows the exact reasons)
  if (error.code === 'QUIZ_NOT_READY') return 'Finish the final quiz before publishing: add a complete question or delete the quiz. The Quiz tab lists what is missing.'

  return error.message
}

const change = async (status) => {
  message.value = ''

  try {
    await mutation.mutateAsync(status)
    confirmOpen.value = false
  } catch (error) {
    message.value = describe(normalizeError(error))
    confirmOpen.value = false
  }
}

const onClick = () => (published.value ? (confirmOpen.value = true) : change('published'))
</script>

<template>
  <div>
    <AppButton :variant="published ? 'secondary' : 'primary'" :loading="mutation.isPending.value && !confirmOpen" @click="onClick">
      {{ published ? 'Unpublish' : 'Publish' }}
    </AppButton>
    <InlineAlert v-if="message" tone="danger" class="mt-2">{{ message }}</InlineAlert>

    <ConfirmDialog
      :open="confirmOpen"
      :title="`Unpublish ${courseName}?`"
      confirm-label="Unpublish"
      :loading="mutation.isPending.value"
      @confirm="change('draft')"
      @cancel="confirmOpen = false"
    >
      <p>Students lose access to this course immediately.</p>
      <p>Their progress is kept, and returns if you publish the course again.</p>
    </ConfirmDialog>
  </div>
</template>
