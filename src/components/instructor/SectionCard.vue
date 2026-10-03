<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { R } from '@/constants/routes.js'
import { useDeleteSection, useRenameSection, useReorderLessons } from '@/composables/instructorMutations.js'
import { fieldErrors, normalizeError } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppInput from '@/components/ui/AppInput.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import MoveButtons from '@/components/ui/MoveButtons.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import LessonRow from './LessonRow.vue'

// One section: rename, delete (with its lessons), reorder among sections (the page owns that,
// because the backend needs the complete list), and its lessons with their own reordering.
const props = defineProps({
  courseId: { type: String, required: true },
  section: { type: Object, required: true }, // { _id, title, lessons: [{ _id, title, type }] }
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['move'])

const courseId = computed(() => props.courseId)
const rename = useRenameSection(courseId)
const remove = useDeleteSection(courseId)
const reorder = useReorderLessons(courseId)

const editing = ref(false)
const title = reactive({ value: '', error: '' })
const confirmOpen = ref(false)
const deleteError = ref('')
const reorderMessage = ref('')

const lessonCount = computed(() => props.section.lessons.length)

const titleInput = ref(null)
const renameButton = ref(null)

// The button that opened the inline form disappears, so keyboard focus moves into the new
// field, and returns to the button when the form closes.
const startRename = async () => {
  title.value = props.section.title
  title.error = ''
  editing.value = true
  await nextTick()
  titleInput.value?.focus()
}

const stopRename = async () => {
  editing.value = false
  await nextTick()
  renameButton.value?.$el?.focus()
}

const saveRename = async () => {
  if (title.value.trim().length < 3) {
    title.error = 'Enter a title of at least 3 characters.'

    return
  }

  try {
    await rename.mutateAsync({ sectionId: props.section._id, title: title.value.trim() })
    await stopRename()
  } catch (caught) {
    const error = normalizeError(caught)

    title.error = fieldErrors(error).title ?? error.message
  }
}

const confirmDelete = async () => {
  deleteError.value = ''

  try {
    await remove.mutateAsync(props.section._id)
    confirmOpen.value = false
  } catch (caught) {
    deleteError.value = normalizeError(caught).message
  }
}

// Sends the complete lesson id list of this section with the moved lesson swapped; on
// failure the cache is refetched (see useReorderLessons) so the server's order is shown.
const moveLesson = async (lessonIndex, delta) => {
  const ids = props.section.lessons.map((lesson) => lesson._id)
  const target = lessonIndex + delta

  if (target < 0 || target >= ids.length) return

  ;[ids[lessonIndex], ids[target]] = [ids[target], ids[lessonIndex]]
  reorderMessage.value = ''

  try {
    await reorder.mutateAsync({ sectionId: props.section._id, lessonIds: ids })
  } catch (caught) {
    const error = normalizeError(caught)

    reorderMessage.value =
      error.code === 'REORDER_MISMATCH'
        ? 'The lessons changed elsewhere, so the current order was reloaded. Please try again.'
        : error.message
  }
}
</script>

<template>
  <li>
    <!-- Course -> Section -> Lesson: the section is a card with a header band (number, title,
         lesson count, section actions); its lessons are an indented list inside it. -->
    <div class="card overflow-hidden">
      <div class="flex flex-col gap-3 border-b border-line bg-surface-muted/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div class="min-w-0 flex-1">
          <form v-if="editing" class="flex flex-col gap-2 sm:flex-row sm:items-end" novalidate @submit.prevent="saveRename">
            <div class="flex-1">
              <AppInput ref="titleInput" v-model="title.value" label="Section title" required :error="title.error" />
            </div>
            <AppButton type="submit" :loading="rename.isPending.value">Save</AppButton>
            <AppButton variant="secondary" @click="stopRename">Cancel</AppButton>
          </form>
          <template v-else>
            <h2 class="type-section-title break-words">
              <span class="mr-2 text-sm font-medium text-ink-muted">{{ index + 1 }}.</span>{{ section.title }}
            </h2>
            <p class="type-meta">{{ lessonCount }} {{ lessonCount === 1 ? 'lesson' : 'lessons' }}</p>
          </template>
        </div>

        <div v-if="!editing" class="flex flex-wrap items-center gap-2">
          <MoveButtons :name="`section “${section.title}”`" :index="index" :total="total" :busy="busy" @move="(delta) => emit('move', delta)" />
          <AppButton ref="renameButton" variant="secondary" :aria-label="`Rename section ${section.title}`" @click="startRename">Rename</AppButton>
          <AppButton variant="danger-quiet" :aria-label="`Delete section ${section.title}`" @click="confirmOpen = true">Delete</AppButton>
        </div>
      </div>

      <div class="px-4 py-2 sm:px-5">
        <InlineAlert v-if="reorderMessage" tone="warning" class="my-2">{{ reorderMessage }}</InlineAlert>

        <p v-if="lessonCount === 0" class="type-meta my-3 rounded-control border border-dashed border-line-control p-4">
          No lessons yet. A course needs at least one lesson before it can be published.
        </p>
        <ul v-else class="divide-y divide-line">
          <LessonRow
            v-for="(lesson, lessonIndex) in section.lessons"
            :key="lesson._id"
            :course-id="courseId"
            :lesson="lesson"
            :index="lessonIndex"
            :total="lessonCount"
            :busy="reorder.isPending.value"
            @move="(delta) => moveLesson(lessonIndex, delta)"
          />
        </ul>

        <div class="border-t border-line py-3">
          <AppButton
            variant="secondary"
            :to="{ name: R.INSTRUCTOR_LESSON_NEW, params: { courseId, sectionId: section._id } }"
            :aria-label="`Add a lesson to ${section.title}`"
          >
            <AppIcon name="plus" class="h-4 w-4" />
            Add lesson
          </AppButton>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      :title="`Delete section “${section.title}”?`"
      confirm-label="Delete section"
      :loading="remove.isPending.value"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="confirmOpen = false; deleteError = ''"
    >
      <p>
        This deletes the section and its {{ lessonCount }} {{ lessonCount === 1 ? 'lesson' : 'lessons' }} permanently,
        together with every student’s progress in them.
      </p>
    </ConfirmDialog>
  </li>
</template>
