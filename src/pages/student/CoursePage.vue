<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useStudentCourseQuery } from '@/composables/studentQueries.js'
import { formatDateTime } from '@/utils/date.js'
import { certificateAction, courseAction, courseState, lessonCountText } from '@/utils/studentCourse.js'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppButton from '@/components/ui/AppButton.vue'
import CourseCover from '@/components/ui/CourseCover.vue'
import CohortLine from '@/components/ui/CohortLine.vue'
import { learningStations } from '@/utils/learningLine.js'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import CourseOutline from '@/components/student/CourseOutline.vue'
import StudentQuizCard from '@/components/student/StudentQuizCard.vue'
import StudentQueryState from '@/components/student/StudentQueryState.vue'

// The learning view of one course. Progress, completion, section counts, the outline order
// and the "up next" lesson are the backend's (GET /api/students-courses/:courseId). The
// outline is never reordered and "current position" is the backend's nextLesson, not state
// kept here.
const props = defineProps({
  courseId: { type: String, required: true },
})

const course = useStudentCourseQuery(computed(() => props.courseId))

const data = computed(() => course.data.value ?? null)
const state = computed(() => courseState(data.value?.progress, data.value?.quiz))
const action = computed(() => (data.value ? courseAction(data.value) : null))
const certificate = computed(() => (data.value ? certificateAction(data.value) : null))
const lastActivity = computed(() => formatDateTime(data.value?.lastActivityAt))
</script>

<template>
  <div>
    <p class="mb-4 text-sm">
      <RouterLink :to="{ name: R.STUDENT_COURSES }" class="back-link">← My Courses</RouterLink>
    </p>

    <StudentQueryState
      :pending="course.isPending.value"
      :error="course.error.value"
      :empty="false"
      subject="this course"
      loading-label="Loading the course…"
      unavailable-title="This course is no longer available"
      unavailable-description="It may have been unpublished, or you may no longer be enrolled. Your other courses are not affected."
      @retry="course.refetch()"
    >
      <template v-if="data">
        <header class="mb-8 grid items-center gap-8 md:grid-cols-[2fr_3fr]">
          <CourseCover :course="data" class="aspect-video w-full md:aspect-[4/3]" />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 class="type-page-title min-w-0 break-words">{{ data.name }}</h1>
              <StatusBadge kind="learning" :status="state" />
            </div>
            <p v-if="data.tagline || data.category?.name" class="type-meta mt-1">
              <span v-if="data.category?.name">{{ data.category.name }}</span>
              <span v-if="data.tagline && data.category?.name"> · </span>
              <span v-if="data.tagline">{{ data.tagline }}</span>
            </p>
            <p v-if="data.description" class="type-body mt-3 max-w-2xl whitespace-pre-line break-words">{{ data.description }}</p>
          </div>
        </header>

        <section class="mb-12 border-y border-line py-6" aria-labelledby="progress-heading">
          <h2 id="progress-heading" class="type-card-title">Your progress</h2>
          <div class="mt-3 max-w-xl">
            <CohortLine :stations="learningStations(data)" />
            <ProgressBar
              :percent="data.progress.percent"
              :completed="data.progress.completed"
              :label="`Progress in ${data.name}`"
              :text="`${lessonCountText(data.progress)} · ${data.progress.percent}%${data.progress.completed ? ' · Completed' : ''}`"
            />
          </div>
          <p v-if="lastActivity" class="type-meta mt-2">Last activity: {{ lastActivity }}</p>

          <InlineAlert v-if="data.progress.completed" tone="success" title="Course completed" class="mt-4">
            All {{ data.progress.totalLessons }} {{ data.progress.totalLessons === 1 ? 'lesson is' : 'lessons are' }} completed. You can review any lesson below.
          </InlineAlert>
          <div v-else-if="data.nextLesson && action" class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <AppButton :to="action.to">
              {{ action.label }}
              <AppIcon name="arrow-right" class="h-4 w-4" />
            </AppButton>
            <p class="type-body">
              <span class="font-medium">Next lesson:</span> {{ data.nextLesson.title }}
              <span v-if="data.nextLesson.sectionTitle" class="text-ink-muted">· {{ data.nextLesson.sectionTitle }}</span>
            </p>
          </div>
          <!-- every lesson is done but the final quiz is still to pass: the percent stays the lesson percent -->
          <InlineAlert v-else-if="data.quiz && !data.nextLesson" tone="info" title="All lessons completed" class="mt-4">
            {{ data.quiz.state === 'not-ready' ? 'The final quiz is not available yet.' : 'Pass the final quiz below to complete the course.' }}
          </InlineAlert>

          <div v-if="certificate" class="mt-4">
            <AppButton variant="secondary" :to="certificate.to">
              <AppIcon name="certificate" class="h-4 w-4" />
              {{ certificate.label }}
            </AppButton>
          </div>
        </section>

        <section aria-labelledby="outline-heading">
          <SectionHeader id="outline-heading" title="Course outline" />

          <div
            v-if="data.sections.length === 0"
            class="card type-meta p-6 text-center"
          >
            This course has no lessons yet. They appear here when your instructor adds them.
          </div>
          <CourseOutline v-else :course-id="data._id" :sections="data.sections" :next-lesson-id="data.nextLesson?._id ?? null" />
        </section>
        <StudentQuizCard v-if="data.quiz" :course-id="data._id" :quiz="data.quiz" class="mt-8" />
      </template>
    </StudentQueryState>
  </div>
</template>
