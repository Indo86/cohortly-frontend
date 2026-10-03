<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useOverviewQuery } from '@/composables/instructorQueries.js'
import { useAuthStore } from '@/stores/auth.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import DataState from '@/components/feedback/DataState.vue'

// Every number comes from GET /api/overviews. Nothing is computed or invented here: no charts,
// no trends, no scores, because the backend has no data for them.
const auth = useAuthStore()
const overview = useOverviewQuery()

const data = computed(() => overview.data.value)
const firstUse = computed(() => data.value && data.value.totalCourses === 0 && data.value.totalStudents === 0)
const courses = computed(() => (data.value?.courses ?? []).slice(0, 5))
</script>

<template>
  <div>
    <PageHeader :title="`Welcome, ${auth.user?.name ?? ''}`" description="An overview of your courses and students.">
      <template #actions>
        <AppButton variant="secondary" :to="{ name: R.INSTRUCTOR_STUDENT_NEW }">Add student</AppButton>
        <AppButton :to="{ name: R.INSTRUCTOR_COURSE_NEW }">New course</AppButton>
      </template>
    </PageHeader>

    <DataState
      :pending="overview.isPending.value"
      :error="overview.error.value"
      :empty="Boolean(firstUse)"
      subject="your overview"
      loading-label="Loading your overview…"
      empty-title="Let’s set up your first course"
      empty-description="Create a course, add sections and lessons, then add students and enroll them."
      empty-icon="courses"
      @retry="overview.refetch()"
    >
      <template #empty-actions>
        <AppButton :to="{ name: R.INSTRUCTOR_COURSE_NEW }">Create your first course</AppButton>
        <AppButton :to="{ name: R.INSTRUCTOR_STUDENT_NEW }" variant="secondary">Add a student</AppButton>
      </template>

      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" class="sr-only">Overview</h2>
        <dl class="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Courses" :value="data.totalCourses" />
          <StatCard label="Published" :value="data.publishedCourses" />
          <StatCard label="Students" :value="data.totalStudents" />
          <StatCard label="Video lessons" :value="data.totalVideos" />
          <StatCard label="Text lessons" :value="data.totalTexts" />
        </dl>
      </section>

      <section class="mt-8" aria-labelledby="your-courses-heading">
        <SectionHeader id="your-courses-heading" title="Your courses">
          <template #actions>
            <RouterLink :to="{ name: R.INSTRUCTOR_COURSES }" class="type-link text-sm">View all</RouterLink>
          </template>
        </SectionHeader>

        <AppCard v-if="courses.length === 0" as="div">
          <p class="type-body">
            You have no courses yet, but you do have students.
            <RouterLink :to="{ name: R.INSTRUCTOR_COURSE_NEW }" class="type-link">Create a course</RouterLink>
          </p>
        </AppCard>
        <ul v-else class="card divide-y divide-line">
          <li v-for="course in courses" :key="course._id" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
            <RouterLink
              :to="{ name: R.INSTRUCTOR_COURSE, params: { courseId: course._id } }"
              class="type-card-title min-w-0 break-words hover:underline"
            >
              {{ course.name }}
            </RouterLink>
            <span class="type-meta flex items-center gap-3">
              {{ course.total_students }} {{ course.total_students === 1 ? 'student' : 'students' }}
              <StatusBadge :status="course.status" />
            </span>
          </li>
        </ul>
      </section>
    </DataState>
  </div>
</template>
