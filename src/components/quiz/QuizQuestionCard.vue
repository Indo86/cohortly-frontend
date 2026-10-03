<script setup>
import { computed, ref } from 'vue'
import { useDeleteQuestion, useUpdateQuestion } from '@/composables/instructorMutations.js'
import { normalizeError } from '@/services/apiError.js'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import MoveButtons from '@/components/ui/MoveButtons.vue'
import QuestionEditor from './QuestionEditor.vue'

// One question in the instructor's quiz editor: read view (the correct option is marked with an
// icon AND the word "Correct"), inline edit, delete with a confirmation, and reordering among the
// questions (the page owns the reorder because the backend needs the complete list).
const props = defineProps({
  courseId: { type: String, required: true },
  quizId: { type: String, required: true },
  question: { type: Object, required: true }, // { _id, prompt, order, options: [{ _id, text, isCorrect }] }
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['move'])

const courseId = computed(() => props.courseId)
const update = useUpdateQuestion(courseId)
const remove = useDeleteQuestion(courseId)

const editing = ref(false)
const confirmOpen = ref(false)
const deleteError = ref('')

const save = async (question) => {
  try {
    await update.mutateAsync({ quizId: props.quizId, questionId: props.question._id, question })
    editing.value = false
  } catch {
    // shown by the editor (update.error)
  }
}

const confirmDelete = async () => {
  deleteError.value = ''

  try {
    await remove.mutateAsync({ quizId: props.quizId, questionId: props.question._id })
    confirmOpen.value = false
  } catch (caught) {
    deleteError.value = normalizeError(caught).message
  }
}

const label = computed(() => `question ${props.index + 1}`)
</script>

<template>
  <li class="card-row">
    <QuestionEditor
      v-if="editing"
      :question="question"
      :pending="update.isPending.value"
      :server-error="update.error.value"
      @submit="save"
      @cancel="editing = false; update.reset()"
    />

    <template v-else>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <p class="type-eyebrow">Question {{ index + 1 }}</p>
          <h3 class="type-card-title mt-1 break-words">{{ question.prompt }}</h3>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <MoveButtons :name="label" :index="index" :total="total" :busy="busy" @move="(delta) => emit('move', delta)" />
          <AppButton variant="secondary" :aria-label="`Edit ${label}`" @click="editing = true">Edit</AppButton>
          <AppButton variant="danger-quiet" :aria-label="`Delete ${label}`" @click="confirmOpen = true">Delete</AppButton>
        </div>
      </div>

      <ul class="mt-4 flex flex-col gap-2">
        <li
          v-for="option in question.options"
          :key="option._id"
          class="flex items-start gap-3 rounded-control border px-3 py-2 text-sm"
          :class="option.isCorrect ? 'border-success/40 bg-success-soft/50' : 'border-line'"
        >
          <AppIcon :name="option.isCorrect ? 'check-circle' : 'circle'" class="mt-0.5 h-5 w-5 shrink-0" :class="option.isCorrect ? 'text-success' : 'text-ink-muted'" />
          <span class="min-w-0 flex-1 break-words text-ink">{{ option.text }}</span>
          <AppBadge v-if="option.isCorrect" tone="success">Correct</AppBadge>
        </li>
      </ul>
    </template>

    <ConfirmDialog
      :open="confirmOpen"
      :title="`Delete ${label}?`"
      confirm-label="Delete question"
      :loading="remove.isPending.value"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="confirmOpen = false; deleteError = ''"
    >
      <p>“{{ question.prompt }}” is removed from the quiz permanently.</p>
      <p>Attempts that were already submitted are kept as history and are not changed.</p>
    </ConfirmDialog>
  </li>
</template>
