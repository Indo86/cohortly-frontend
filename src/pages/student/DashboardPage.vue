<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useStudentCoursesQuery } from '@/composables/studentQueries.js'
import { useAuthStore } from '@/stores/auth.js'
import { courseAction, lessonCountText } from '@/utils/studentCourse.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import StudentCourseCard from '@/components/student/StudentCourseCard.vue'
import StudentQueryState from '@/components/student/StudentQueryState.vue'

// Everything here is the backend's answer from GET /api/students-courses (already limited to
// the student's enrolled, published courses, in the backend's order).
//
// Continue Learning = the FIRST course, in that order, that has a backend `nextLesson`.
// There is no ranking, recency or scoring logic.
const auth = useAuthStore()
const courses = useStudentCoursesQuery()

const list = computed(() => courses.data.value ?? [])
// the next thing to do is the backend nextActivity (a lesson or the final quiz); nextLesson is the older field
const activityOf = (course) => course.nextActivity ?? (course.nextLesson ? { type: 'lesson', ...course.nextLesson } : null)
const continueCourse = computed(() => list.value.find((course) => activityOf(course)) ?? null)
const continueActivity = computed(() => (continueCourse.value ? activityOf(continueCourse.value) : null))
const completedCount = computed(() => list.value.filter((course) => course.progress.completed).length)
const allCompleted = computed(() => list.value.length > 0 && completedCount.value === list.value.length)
</script>

<template>
  <div>
    <PageHeader :title="`Welcome, ${auth.user?.name ?? ''}`" description="Pick up where you left off." />

    <StudentQueryState
      :pending="courses.isPending.value"
      :error="courses.error.value"
      :empty="list.length === 0"
      subject="your courses"
      loading-label="Loading your courses…"
      empty-title="You are not enrolled in any course yet"
      empty-description="When your instructor enrolls you in a published course, it appears here."
      @retry="courses.refetch()"
    >
      <!-- 1. where to go next: the one thing this page is for -->
      <section class="card mb-10 border-l-4 border-l-primary p-5 sm:p-6" aria-labelledby="continue-heading">
        <h2 id="continue-heading" class="type-section-title">Continue learning</h2>

        <div v-if="continueCourse" class="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div class="min-w-0 sm:max-w-xl sm:flex-1">
            <p class="break-words text-xl font-semibold leading-7 text-ink">{{ continueCourse.name }}</p>
            <p v-if="continueActivity.type === 'quiz'" class="type-body mt-1">
              <span class="font-medium">Next:</span> Final quiz · {{ continueActivity.title }}
            </p>
            <p v-else class="type-body mt-1">
              <span class="font-medium">Next lesson:</span> {{ continueActivity.title }}
              <span v-if="continueActivity.sectionTitle" class="text-ink-muted">· {{ continueActivity.sectionTitle }}</span>
            </p>
            <div class="mt-4">
              <ProgressBar
                :percent="continueCourse.progress.percent"
                :completed="continueCourse.progress.completed"
                :label="`Progress in ${continueCourse.name}`"
                :text="`${lessonCountText(continueCourse.progress)} · ${continueCourse.progress.percent}%`"
              />
            </div>
          </div>
          <AppButton :to="courseAction(continueCourse).to" :aria-label="`${courseAction(continueCourse).label}: ${continueCourse.name}`">
            {{ courseAction(continueCourse).label }}
            <AppIcon name="arrow-right" class="h-4 w-4" />
          </AppButton>
        </div>

        <div v-else-if="allCompleted" class="mt-3">
          <p class="type-body">
            You have completed {{ list.length === 1 ? 'your course' : `all ${list.length} of your courses` }}. You can review any lesson whenever you like.
          </p>
          <div class="mt-4">
            <AppButton variant="secondary" :to="{ name: R.STUDENT_COURSES }">Review my courses</AppButton>
          </div>
        </div>

        <p v-else class="type-body mt-3">
          There is no lesson to continue right now. New lessons appear here as your instructor adds them.
        </p>

        <p class="type-meta mt-5 border-t border-line pt-4">
          {{ list.length }} {{ list.length === 1 ? 'course' : 'courses' }} · {{ completedCount }} completed
        </p>
      </section>

      <!-- 2. everything the student is enrolled in -->
      <section aria-labelledby="my-courses-heading">
        <SectionHeader id="my-courses-heading" title="My courses">
          <template #actions>
            <RouterLink :to="{ name: R.STUDENT_COURSES }" class="type-link text-sm">View all</RouterLink>
          </template>
        </SectionHeader>
        <ul class="flex flex-col gap-3">
          <StudentCourseCard v-for="course in list" :key="course._id" :course="course" />
        </ul>
      </section>
    </StudentQueryState>
  </div>
</template>
