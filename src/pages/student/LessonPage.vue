<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCompleteLesson, useUndoLessonCompletion } from '@/composables/studentMutations.js'
import { useStudentCourseQuery, useStudentLessonQuery } from '@/composables/studentQueries.js'
import { normalizeError } from '@/services/apiError.js'
import { formatDateTime } from '@/utils/date.js'
import { courseRoute, lessonCountText, lessonRoute } from '@/utils/studentCourse.js'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import CohortLine from '@/components/ui/CohortLine.vue'
import { learningStations } from '@/utils/learningLine.js'
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
const toolsOpen = ref(false)
const lessonPosition = computed(() => {
  const lessons = (course.value?.sections ?? []).flatMap((section) => section.lessons ?? [])
  const index = lessons.findIndex((item) => item._id === lessonId.value)
  return index >= 0 ? 'Lesson ' + (index + 1) + ' of ' + lessons.length : ''
})
// same position as the label above, as a share of the course, for the thin bar under the toolbar
const positionPercent = computed(() => {
  const match = /(\d+) of (\d+)/.exec(lessonPosition.value)
  return match ? Math.round((Number(match[1]) / Number(match[2])) * 100) : 0
})
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
  <div class="lesson-reader">
    <nav aria-label="Breadcrumb" class="reader-toolbar flex flex-wrap items-center justify-between gap-2 pb-3 text-sm">
      <RouterLink :to="courseRoute(courseId)" class="back-link">← {{ course ? `Back to ${course.name}` : 'Back to the course' }}</RouterLink>
      <span v-if="lessonPosition" class="type-eyebrow">{{ lessonPosition }}</span>
    </nav>
    <div aria-hidden="true" class="reader-progress relative mb-4 h-0.5 bg-line">
      <div class="absolute inset-y-0 left-0 bg-primary transition-[width] duration-300" :style="{ width: positionPercent + '%' }" />
      <span v-if="lessonPosition" class="absolute -top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-accent transition-[left] duration-300" :style="{ left: positionPercent + '%' }" />
    </div>

    <StudentQueryState
      :pending="lessonQuery.isPending.value"
      :error="lessonQuery.error.value"
      :empty="false"
      loading-label="Loading the lesson…"
      unavailable-title="This lesson is no longer available"
      unavailable-description="The course or lesson may have been unpublished or removed. Your other courses are not affected."
      @retry="lessonQuery.refetch()"
    >
      <div v-if="lesson" class="reader-grid relative" :class="toolsOpen ? 'reader-with-tools' : ''">
      <article class="reader-article mx-auto min-w-0 w-full max-w-[48rem] bg-surface px-4 pb-28 pt-16 md:px-12 md:pb-8 md:pt-24">
        <header class="mb-6">
          <p v-if="lesson.sectionTitle" class="type-eyebrow">{{ lesson.sectionTitle }}</p>
          <h1 ref="heading" tabindex="-1" class="mt-3 break-words font-display text-[2rem] font-medium leading-[2.375rem] tracking-tight text-ink md:text-reader-title">
            {{ lesson.title }}
          </h1>
          <p class="mt-2 flex flex-wrap items-center gap-2">
            <AppBadge>{{ lesson.type === 'video' ? 'Video lesson' : 'Text lesson' }}</AppBadge>
            <AppBadge :tone="lesson.completed ? 'success' : 'neutral'">{{ lesson.completed ? 'Completed' : 'Not completed' }}</AppBadge>
            <span v-if="lesson.completed && completedAt" class="type-help">on {{ completedAt }}</span>
          </p>
        </header>

        <div v-if="course" class="mb-12 border-y border-line py-4">
          <CohortLine :stations="learningStations(course, lessonId)" />
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

        <div class="lesson-completion mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-6" role="group" aria-label="Lesson completion">
          <h2 class="type-section-title w-full">{{ lesson.completed ? 'Lesson completed' : (lesson.type === 'video' ? 'Finished watching?' : 'Finished reading?') }}</h2>
          <template v-if="lesson.completed">
            <AppButton variant="secondary" :loading="working" @click="markIncomplete">Mark as incomplete</AppButton>
          </template>
          <template v-else>
            <AppButton :loading="working" @click="completeAndContinue">Complete and continue</AppButton>
            <AppButton variant="secondary" :disabled="working" @click="markComplete">Mark as complete</AppButton>
          </template>
        </div>

        <nav aria-label="Lesson navigation" class="lesson-navigation mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
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
      </article>
        <nav aria-label="Mobile lesson navigation" class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-3 border-t border-line bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden print:hidden">
          <AppButton variant="ghost" :to="lesson.previousLessonId ? lessonRoute(courseId, lesson.previousLessonId) : null" :disabled="!lesson.previousLessonId" aria-label="Previous lesson" class="!px-2"><AppIcon name="arrow-left" /></AppButton>
          <AppButton v-if="!lesson.completed" :loading="working" @click="completeAndContinue">Complete &amp; continue</AppButton>
          <span v-else class="flex min-h-11 items-center justify-center gap-2 text-sm text-success"><AppIcon name="check-circle" class="h-5 w-5" />Completed</span>
          <AppButton variant="ghost" :to="lesson.nextLessonId ? lessonRoute(courseId, lesson.nextLessonId) : null" :disabled="!lesson.nextLessonId" aria-label="Next lesson" class="!px-2"><AppIcon name="arrow-right" /></AppButton>
        </nav>
        <LessonAssistant :key="lessonId" :course-id="courseId" :lesson-id="lessonId" :lesson-type="lesson.type" @toggle="toolsOpen = $event" />
      </div>
    </StudentQueryState>
  </div>
</template>
