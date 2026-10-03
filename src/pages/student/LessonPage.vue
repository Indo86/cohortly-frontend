<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCompleteLesson, useUndoLessonCompletion } from '@/composables/studentMutations.js'
import { useStudentCourseQuery, useStudentLessonQuery } from '@/composables/studentQueries.js'
import { normalizeError } from '@/services/apiError.js'
import { formatDateTime } from '@/utils/date.js'
import { courseRoute, lessonCountText, lessonRoute } from '@/utils/studentCourse.js'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import LessonAssistant from '@/components/student/LessonAssistant.vue'
import LessonContent from '@/components/student/LessonContent.vue'
import StudentQueryState from '@/components/student/StudentQueryState.vue'

// One lesson. What is shown comes from the backend: the lesson (content, completed,
// completedAt, previousLessonId, nextLessonId) and the course (name, progress, nextLesson).
// Previous / Next use the backend ids as they are (they cross sections as the backend
// defines), and nothing is marked complete before the backend has confirmed it.
const props = defineProps({
  courseId: { type: String, required: true },
  lessonId: { type: String, required: true },
})

const router = useRouter()
const courseId = computed(() => props.courseId)
const lessonId = computed(() => props.lessonId)

const lessonQuery = useStudentLessonQuery(courseId, lessonId)
const courseQuery = useStudentCourseQuery(courseId)
const completeMutation = useCompleteLesson(courseId)
const undoMutation = useUndoLessonCompletion(courseId)

const lesson = computed(() => lessonQuery.data.value ?? null)
const course = computed(() => courseQuery.data.value ?? null)
const completedAt = computed(() => formatDateTime(lesson.value?.completedAt))

// one completion action at a time, including the navigation that may follow it
const working = ref(false)
const actionError = ref('')

const run = async (action) => {
  if (working.value) return

  working.value = true
  actionError.value = ''

  try {
    await action()
  } catch (caught) {
    // the lesson on screen is left exactly as it was
    actionError.value = normalizeError(caught).message
  } finally {
    working.value = false
  }
}

const markComplete = () => run(() => completeMutation.mutateAsync(lessonId.value))

// navigation waits for the backend's answer and then follows ITS nextLesson
const completeAndContinue = () =>
  run(async () => {
    const result = await completeMutation.mutateAsync(lessonId.value)

    await router.push(result.nextLesson ? lessonRoute(courseId.value, result.nextLesson._id) : courseRoute(courseId.value))
  })

const markIncomplete = () => run(() => undoMutation.mutateAsync(lessonId.value))

// after moving to another lesson, keyboard and screen-reader users start at its title
const heading = ref(null)

let shownLessonId = null

watch(
  () => lesson.value?._id,
  async (id) => {
    if (!id) return

    actionError.value = ''

    const moved = shownLessonId !== null && shownLessonId !== id

    shownLessonId = id

    if (moved) {
      await nextTick()
      heading.value?.focus()
    }
  }
)
</script>

<template>
  <div class="mx-auto max-w-reading">
    <nav aria-label="Breadcrumb" class="mb-4 text-sm">
      <RouterLink :to="courseRoute(courseId)" class="back-link">← {{ course ? `Back to ${course.name}` : 'Back to the course' }}</RouterLink>
    </nav>

    <StudentQueryState
      :pending="lessonQuery.isPending.value"
      :error="lessonQuery.error.value"
      :empty="false"
      loading-label="Loading the lesson…"
      unavailable-title="This lesson is no longer available"
      unavailable-description="The course or lesson may have been unpublished or removed. Your other courses are not affected."
      @retry="lessonQuery.refetch()"
    >
      <article v-if="lesson">
        <header class="mb-6">
          <p v-if="lesson.sectionTitle" class="type-eyebrow">{{ lesson.sectionTitle }}</p>
          <h1 ref="heading" tabindex="-1" class="type-page-title mt-1 break-words">
            {{ lesson.title }}
          </h1>
          <p class="mt-2 flex flex-wrap items-center gap-2">
            <AppBadge>{{ lesson.type === 'video' ? 'Video lesson' : 'Text lesson' }}</AppBadge>
            <AppBadge :tone="lesson.completed ? 'success' : 'neutral'">{{ lesson.completed ? 'Completed' : 'Not completed' }}</AppBadge>
            <span v-if="lesson.completed && completedAt" class="type-help">on {{ completedAt }}</span>
          </p>
        </header>

        <div v-if="course" class="mb-8">
          <ProgressBar
            :percent="course.progress.percent"
            :completed="course.progress.completed"
            :label="`Progress in ${course.name}`"
            :text="`${course.name}: ${lessonCountText(course.progress)} · ${course.progress.percent}%`"
          />
        </div>

        <LessonContent :lesson="lesson" />

        <InlineAlert v-if="course?.progress.completed" tone="success" title="Course completed" class="mt-10">
          All {{ course.progress.totalLessons }} {{ course.progress.totalLessons === 1 ? 'lesson is' : 'lessons are' }} completed.
          <RouterLink :to="courseRoute(courseId)" class="font-semibold underline">Review the course</RouterLink>
        </InlineAlert>

        <InlineAlert
          v-else-if="course?.quiz && !course.nextLesson && !course.progress.completed"
          tone="info"
          title="All lessons completed"
          class="mt-10"
        >
          The final quiz is the last step of this course.
          <RouterLink :to="courseRoute(courseId)" class="font-semibold underline">Go to the course page</RouterLink>
        </InlineAlert>

        <InlineAlert v-if="actionError" tone="danger" class="mt-8">{{ actionError }}</InlineAlert>

        <div class="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6" role="group" aria-label="Lesson completion">
          <template v-if="lesson.completed">
            <AppButton variant="secondary" :loading="working" @click="markIncomplete">Mark as incomplete</AppButton>
          </template>
          <template v-else>
            <AppButton :loading="working" @click="completeAndContinue">Complete and continue</AppButton>
            <AppButton variant="secondary" :disabled="working" @click="markComplete">Mark as complete</AppButton>
          </template>
        </div>

        <nav aria-label="Lesson navigation" class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <AppButton v-if="lesson.previousLessonId" variant="secondary" :to="lessonRoute(courseId, lesson.previousLessonId)">Previous lesson</AppButton>
          <AppButton v-else variant="secondary" disabled>Previous lesson</AppButton>

          <AppButton
            v-if="lesson.nextLessonId"
            :variant="lesson.completed ? 'primary' : 'secondary'"
            :to="lessonRoute(courseId, lesson.nextLessonId)"
          >
            Next lesson
          </AppButton>
          <AppButton v-else variant="secondary" disabled>Next lesson</AppButton>
        </nav>

        <!-- optional AI study tools: secondary, collapsed, hidden when AI is off; the lesson never depends on them -->
        <LessonAssistant :key="lessonId" :course-id="courseId" :lesson-id="lessonId" :lesson-type="lesson.type" />
      </article>
    </StudentQueryState>
  </div>
</template>
