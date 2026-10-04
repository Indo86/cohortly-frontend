<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useOverviewQuery } from '@/composables/instructorQueries.js'
import { useAuthStore } from '@/stores/auth.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import CourseCover from '@/components/ui/CourseCover.vue'
import PersonRow from '@/components/ui/PersonRow.vue'
import SetupJourney from '@/components/instructor/SetupJourney.vue'
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
    <p class="type-eyebrow mb-3">Instructor workspace</p>
    <PageHeader :title="`Welcome, ${auth.user?.name ?? ''}`" description="An overview of your courses and students.">
      <template #actions>
        <AppButton variant="secondary" :to="{ name: R.INSTRUCTOR_STUDENT_NEW }">Add student</AppButton>
        <AppButton :to="{ name: R.INSTRUCTOR_COURSE_NEW }">New course</AppButton>
      </template>
    </PageHeader>

    <DataState
      :pending="overview.isPending.value"
      :error="overview.error.value"
      :empty="false"
      subject="your overview"
      loading-label="Loading your overview…"
      empty-title="Let’s set up your first course"
      empty-description="Create a course, add sections and lessons, then add students and enroll them."
      empty-icon="courses"
      @retry="overview.refetch()"
    >
      <SetupJourney v-if="data" :overview="data" />

      <section v-if="!firstUse" aria-labelledby="overview-heading">
        <h2 id="overview-heading" class="sr-only">Overview</h2>
        <dl class="metric-strip grid grid-cols-2 border-y border-line md:grid-cols-5 [&>div:nth-child(n+3)]:border-t [&>div:nth-child(odd)]:border-l-0 md:[&>div:nth-child(n+3)]:border-t-0 md:[&>div:nth-child(odd)]:border-l md:[&>div:first-child]:border-l-0">
          <StatCard label="Courses" :value="data.totalCourses" />
          <StatCard label="Published" :value="data.publishedCourses" />
          <StatCard label="Students" :value="data.totalStudents" />
          <StatCard label="Video lessons" :value="data.totalVideos" />
          <StatCard label="Text lessons" :value="data.totalTexts" />
        </dl>
      </section>

      <div v-if="!firstUse" class="mt-12 grid gap-12 xl:grid-cols-[7fr_5fr]">
      <section class="min-w-0" aria-labelledby="your-courses-heading">
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
        <ul v-else class="divide-y divide-line border-y border-line">
          <li v-for="course in courses" :key="course._id" class="flex flex-wrap items-center gap-4 py-4">
            <CourseCover :course="course" class="w-24" />
            <div class="min-w-0 flex-1">
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
            </div>
          </li>
        </ul>
      </section>
      <section aria-labelledby="workspace-learners">
        <SectionHeader id="workspace-learners" title="Your students"><template #actions><RouterLink :to="{ name: R.INSTRUCTOR_STUDENTS }" class="type-link text-sm">View students</RouterLink></template></SectionHeader>
        <ul v-if="data.students?.length" class="border-t border-line"><PersonRow v-for="person in data.students.slice(0, 5)" :key="person._id" :person="person" heading="h3"><template #summary><span v-if="person.courses">{{ person.courses.length }} enrolled courses</span></template></PersonRow></ul>
        <p v-else class="type-body border-t border-line py-6">Add students and enroll them in a course to begin learning together.</p>
        <RouterLink :to="{ name: R.INSTRUCTOR_STUDENT_NEW }" class="back-link mt-4">Add a student</RouterLink>
      </section>
      </div>
    </DataState>
  </div>
</template>
