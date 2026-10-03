<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useCourseQuery } from '@/composables/instructorQueries.js'
import { useRouteParam } from '@/composables/useRouteParam.js'
import AppButton from '@/components/ui/AppButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import CourseStatusAction from '@/components/instructor/CourseStatusAction.vue'
import DataState from '@/components/feedback/DataState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { ErrorKind } from '@/services/apiError.js'

// The shared frame of one course: name, status, publish action and the tabs. Every tab is
// its own route/page (content, learners, progress, settings) so no single component grows
// into a monolith; they share the cached course query.
const courseId = useRouteParam('courseId')
const course = useCourseQuery(courseId)

const tabs = computed(() => [
  { label: 'Content', to: { name: R.INSTRUCTOR_COURSE, params: { courseId: courseId.value } }, exact: true },
  { label: 'Quiz', to: { name: R.INSTRUCTOR_COURSE_QUIZ, params: { courseId: courseId.value } } },
  { label: 'Learners', to: { name: R.INSTRUCTOR_COURSE_LEARNERS, params: { courseId: courseId.value } } },
  { label: 'Progress', to: { name: R.INSTRUCTOR_COURSE_PROGRESS, params: { courseId: courseId.value } } },
  { label: 'Settings', to: { name: R.INSTRUCTOR_COURSE_SETTINGS, params: { courseId: courseId.value } } },
])

const notFound = computed(() => course.error.value?.kind === ErrorKind.NOT_FOUND)
</script>

<template>
  <div>
    <ErrorState
      v-if="notFound"
      title="Course not found"
      message="This course does not exist or is not yours."
    >
      <AppButton :to="{ name: R.INSTRUCTOR_COURSES }" variant="secondary">Back to courses</AppButton>
    </ErrorState>

    <DataState
      v-else
      :pending="course.isPending.value"
      :error="course.error.value"
      subject="this course"
      loading-label="Loading the course…"
      @retry="course.refetch()"
    >
      <template v-if="course.data.value">
        <RouterLink :to="{ name: R.INSTRUCTOR_COURSES }" class="back-link">
          ← All courses
        </RouterLink>

        <header class="mb-6 mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <h1 class="type-page-title break-words">{{ course.data.value.name }}</h1>
            <p class="type-meta mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusBadge :status="course.data.value.status" />
              <span>{{ course.data.value.total_sections }} {{ course.data.value.total_sections === 1 ? 'section' : 'sections' }}</span>
              <span aria-hidden="true">·</span>
              <span>{{ course.data.value.total_lessons }} {{ course.data.value.total_lessons === 1 ? 'lesson' : 'lessons' }}</span>
            </p>
          </div>
          <CourseStatusAction
            :course-id="course.data.value._id"
            :status="course.data.value.status"
            :course-name="course.data.value.name"
          />
        </header>

        <nav aria-label="Course sections" class="mb-6 flex gap-1 overflow-x-auto border-b border-line" data-testid="course-tabs">
          <RouterLink
            v-for="tab in tabs"
            :key="tab.label"
            v-slot="{ href, navigate, isActive, isExactActive }"
            :to="tab.to"
            custom
          >
            <a
              :href="href"
              :aria-current="(tab.exact ? isExactActive : isActive) ? 'page' : undefined"
              class="-mb-px inline-flex min-h-[2.75rem] items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors sm:px-4"
              :class="(tab.exact ? isExactActive : isActive) ? 'border-primary text-primary-strong' : 'border-transparent text-ink-muted hover:border-line-control hover:text-ink'"
              @click="navigate"
            >
              {{ tab.label }}
            </a>
          </RouterLink>
        </nav>

        <RouterView />
      </template>
    </DataState>
  </div>
</template>
