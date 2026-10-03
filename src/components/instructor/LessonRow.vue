<script setup>
import { computed, ref } from 'vue'
import { R } from '@/constants/routes.js'
import { useDeleteLesson } from '@/composables/instructorMutations.js'
import { normalizeError } from '@/services/apiError.js'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import MoveButtons from '@/components/ui/MoveButtons.vue'

// One lesson of a section: type, title, edit, delete and reorder within the section.
const props = defineProps({
  courseId: { type: String, required: true },
  lesson: { type: Object, required: true }, // { _id, title, type }
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['move'])

const mutation = useDeleteLesson(computed(() => props.courseId))
const open = ref(false)
const error = ref('')

const confirm = async () => {
  error.value = ''

  try {
    await mutation.mutateAsync(props.lesson._id)
    open.value = false
  } catch (caught) {
    error.value = normalizeError(caught).message
  }
}
</script>

<template>
  <li class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-soft" aria-hidden="true">
        <AppIcon :name="lesson.type === 'video' ? 'play' : 'document'" class="h-5 w-5" />
      </span>
      <span class="type-label min-w-0 break-words">{{ lesson.title }}</span>
      <AppBadge :tone="lesson.type === 'video' ? 'info' : 'neutral'">{{ lesson.type === 'video' ? 'Video' : 'Text' }}</AppBadge>
    </div>
    <div class="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">
      <MoveButtons :name="`lesson “${lesson.title}”`" :index="index" :total="total" :busy="busy" @move="(delta) => emit('move', delta)" />
      <AppButton
        variant="secondary"
        :to="{ name: R.INSTRUCTOR_LESSON_EDIT, params: { courseId, lessonId: lesson._id } }"
        :aria-label="`Edit lesson ${lesson.title}`"
      >
        Edit
      </AppButton>
      <AppButton variant="danger-quiet" :aria-label="`Delete lesson ${lesson.title}`" @click="open = true">Delete</AppButton>
    </div>

    <ConfirmDialog
      :open="open"
      :title="`Delete lesson “${lesson.title}”?`"
      confirm-label="Delete lesson"
      :loading="mutation.isPending.value"
      :error="error"
      @confirm="confirm"
      @cancel="open = false; error = ''"
    >
      <p>The lesson is deleted permanently, together with every student’s completion of it.</p>
    </ConfirmDialog>
  </li>
</template>
