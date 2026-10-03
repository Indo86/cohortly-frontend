<script setup>
import { ref } from 'vue'
import { useDeleteCourse } from '@/composables/instructorMutations.js'
import { normalizeError } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

// Deleting a course is permanent. The dialog spells out exactly what the backend removes.
const props = defineProps({
  course: { type: Object, required: true }, // { _id, name }
  variant: { type: String, default: 'danger-quiet' },
})

const emit = defineEmits(['deleted'])

const mutation = useDeleteCourse()
const open = ref(false)
const error = ref('')

const confirm = async () => {
  error.value = ''

  try {
    await mutation.mutateAsync(props.course._id)
    open.value = false
    emit('deleted')
  } catch (caught) {
    error.value = normalizeError(caught).message
  }
}
</script>

<template>
  <div>
    <AppButton :variant="variant" :aria-label="`Delete course ${course.name}`" @click="open = true">Delete</AppButton>

    <ConfirmDialog
      :open="open"
      :title="`Delete “${course.name}”?`"
      confirm-label="Delete course"
      :loading="mutation.isPending.value"
      :error="error"
      @confirm="confirm"
      @cancel="open = false; error = ''"
    >
      <p>This permanently deletes the course and cannot be undone. It removes:</p>
      <ul class="list-disc pl-5">
        <li>all its sections and lessons,</li>
        <li>every student’s progress in it,</li>
        <li>its enrollments (the students themselves are kept).</li>
      </ul>
    </ConfirmDialog>
  </div>
</template>
