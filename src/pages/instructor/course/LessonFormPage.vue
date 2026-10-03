<script setup>
import { computed, defineAsyncComponent, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useCourseQuery, useLessonQuery } from '@/composables/instructorQueries.js'
import { useCreateLesson, useUpdateLesson } from '@/composables/instructorMutations.js'
import { useRouteParam } from '@/composables/useRouteParam.js'
import { ErrorKind, fieldErrors } from '@/services/apiError.js'
import { parseYoutubeId } from '@/utils/youtube.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import DataState from '@/components/feedback/DataState.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'

// Create (…/sections/:sectionId/lessons/new) and edit (…/lessons/:lessonId/edit) a lesson.
//  TEXT  -> title + rich text (the editor is loaded on demand: it is the heaviest dependency)
//  VIDEO -> title + YouTube video id (no file upload exists in the product)
// A lesson stays in its section: only the lesson's own content can be edited here.
const RichTextEditor = defineAsyncComponent({
  loader: () => import('@/components/instructor/RichTextEditor.vue'),
  loadingComponent: LoadingState,
})

const router = useRouter()
const courseId = useRouteParam('courseId')
const sectionId = useRouteParam('sectionId')
const lessonId = useRouteParam('lessonId')
const editing = computed(() => Boolean(lessonId.value))

const course = useCourseQuery(courseId)
const lesson = useLessonQuery(lessonId)
const create = useCreateLesson(courseId)
const update = useUpdateLesson(courseId)
const mutation = computed(() => (editing.value ? update : create))

const form = reactive({ title: '', type: 'text', text: '', youtube: '' })
const clientErrors = reactive({ title: '', text: '', youtubeId: '' })
const hydrated = ref(false)

// the form is filled once from the stored lesson (edit) or starts empty (create)
watch(
  () => lesson.data.value,
  (stored) => {
    if (!stored || hydrated.value) return

    form.title = stored.title
    form.type = stored.type
    form.text = stored.text ?? ''
    form.youtube = stored.youtubeId ?? ''
    hydrated.value = true
  },
  { immediate: true }
)

const sectionTitle = computed(() => {
  const id = editing.value ? lesson.data.value?.section : sectionId.value

  return course.data.value?.sections.find((section) => section._id === id)?.title ?? ''
})

const serverFields = computed(() => fieldErrors(mutation.value.error.value))
const error = (field) => clientErrors[field] || serverFields.value[field] || ''
const generalMessage = computed(() => {
  const failure = mutation.value.error.value

  if (!failure) return ''
  if (failure.kind === ErrorKind.VALIDATION && Object.keys(serverFields.value).length) return ''

  return failure.message
})

const typeOptions = [
  { value: 'text', label: 'Text' },
  { value: 'video', label: 'Video (YouTube)' },
]

const youtubeId = computed(() => parseYoutubeId(form.youtube))

const validate = () => {
  clientErrors.title = form.title.trim().length >= 5 ? '' : 'Enter a title of at least 5 characters.'
  clientErrors.text = form.type === 'text' && form.text.replace(/<[^>]*>/g, '').trim().length < 4 ? 'Write some lesson content.' : ''
  clientErrors.youtubeId =
    form.type === 'video' && !/^[A-Za-z0-9_-]{4,64}$/.test(youtubeId.value) ? 'Enter a YouTube video id or link.' : ''

  return !clientErrors.title && !clientErrors.text && !clientErrors.youtubeId
}

const goBack = () => router.push({ name: R.INSTRUCTOR_COURSE, params: { courseId: courseId.value } })

const submit = async () => {
  if (!validate()) return

  const values = { title: form.title.trim(), type: form.type, text: form.text, youtubeId: youtubeId.value }

  try {
    if (editing.value) await update.mutateAsync({ lessonId: lessonId.value, lesson: values })
    else await create.mutateAsync({ sectionId: sectionId.value, lesson: values })

    await goBack()
  } catch {
    // the error is shown by the form
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <header class="mb-6">
      <h2 data-page-heading tabindex="-1" class="type-section-title text-xl">{{ editing ? 'Edit lesson' : 'New lesson' }}</h2>
      <p v-if="sectionTitle" class="type-meta mt-1">
        {{ editing ? 'In section' : 'Adding to section' }} “{{ sectionTitle }}”.
      </p>
    </header>

    <AppCard>
      <DataState
        :pending="editing && lesson.isPending.value"
        :error="editing ? lesson.error.value : null"
        subject="the lesson"
        loading-label="Loading the lesson…"
        @retry="lesson.refetch()"
      >
        <form v-if="!editing || hydrated" class="flex flex-col gap-5" novalidate @submit.prevent="submit">
          <InlineAlert v-if="generalMessage" tone="danger">{{ generalMessage }}</InlineAlert>

          <AppInput v-model="form.title" label="Lesson title" required :error="error('title')" />
          <AppSelect
            v-model="form.type"
            label="Lesson type"
            :options="typeOptions"
            required
            :hint="form.type === 'video' ? 'A video lesson shows a YouTube video.' : 'A text lesson is formatted reading material.'"
          />

          <div v-if="form.type === 'text'" class="flex flex-col gap-1.5">
            <span id="lesson-content-label" class="type-label">
              Content <span class="text-danger" aria-hidden="true">*</span>
            </span>
            <RichTextEditor v-model="form.text" label="Lesson content" />
            <p class="type-help">Formatting is cleaned up when you save, so every lesson displays consistently for students.</p>
            <p v-if="error('text')" class="type-error" role="alert">{{ error('text') }}</p>
          </div>

          <AppInput
            v-else
            v-model="form.youtube"
            label="YouTube video"
            required
            hint="Paste the video link or its id (the part after v= in the address)."
            :error="error('youtubeId')"
          />

          <div class="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <AppButton variant="ghost" :to="{ name: R.INSTRUCTOR_COURSE, params: { courseId } }">Cancel</AppButton>
            <AppButton type="submit" :loading="mutation.isPending.value">{{ editing ? 'Save lesson' : 'Create lesson' }}</AppButton>
          </div>
        </form>
      </DataState>
    </AppCard>
  </div>
</template>
