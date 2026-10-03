<script setup>
import { computed } from 'vue'
import { R } from '@/constants/routes.js'
import { useCourseProgressQuery } from '@/composables/instructorQueries.js'
import { useRouteParam } from '@/composables/useRouteParam.js'
import AppButton from '@/components/ui/AppButton.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import LearnerProgressCard from '@/components/instructor/LearnerProgressCard.vue'
import DataState from '@/components/feedback/DataState.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// Progress tab: GET /api/courses/:id/progress. The numbers are the backend's; this page only
// lays them out.
const courseId = useRouteParam('courseId')
const progress = useCourseProgressQuery(courseId)

const data = computed(() => progress.data.value)
const learners = computed(() => data.value?.students ?? [])
</script>

<template>
  <DataState
    :pending="progress.isPending.value"
    :error="progress.error.value"
    :empty="Boolean(data) && learners.length === 0"
    subject="learner progress"
    loading-label="Loading learner progress…"
    empty-title="No learners to show yet"
    empty-description="Progress appears here once students are enrolled in this course."
    empty-icon="students"
    @retry="progress.refetch()"
  >
    <template #empty-actions>
      <AppButton :to="{ name: R.INSTRUCTOR_COURSE_LEARNERS, params: { courseId } }">Enroll students</AppButton>
    </template>

    <div v-if="data" class="flex flex-col gap-6">
      <div v-if="data.course.status === 'draft' || data.course.totalLessons === 0" class="flex flex-col gap-3">
        <InlineAlert v-if="data.course.status === 'draft'" tone="info">
          This course is a draft, so students cannot see it. Any progress below was made while it was published.
        </InlineAlert>
        <InlineAlert v-if="data.course.totalLessons === 0" tone="warning">
          This course has no lessons yet, so there is no progress to measure.
        </InlineAlert>
      </div>

      <section aria-labelledby="progress-summary-heading">
        <h2 id="progress-summary-heading" class="sr-only">Summary</h2>
        <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Enrolled learners" :value="data.summary.enrolledLearners" />
          <StatCard label="Completed the course" :value="data.summary.completedLearners" />
          <StatCard v-if="data.summary.certificatesIssued !== undefined" label="Certificates issued" :value="data.summary.certificatesIssued" />
          <StatCard label="Lessons in the course" :value="data.course.totalLessons" />
          <div class="card p-4">
            <dt class="type-meta">Status</dt>
            <dd class="mt-2"><StatusBadge :status="data.course.status" /></dd>
          </div>
        </dl>
      </section>

      <p v-if="data.quiz" class="type-meta">
        Final quiz: “{{ data.quiz.title }}”, {{ data.quiz.totalQuestions }} {{ data.quiz.totalQuestions === 1 ? 'question' : 'questions' }}, passing score {{ data.quiz.passingScore }}%.
        A learner completes the course after every lesson and a passing attempt.
        <span v-if="!data.quiz.ready" class="font-semibold text-warning-strong">The quiz is not finished yet, so nobody can take it.</span>
      </p>

      <section aria-labelledby="learners-heading">
        <SectionHeader id="learners-heading" title="Learners" description="Progress is shown exactly as the server recorded it." />
        <ul class="flex flex-col gap-3">
          <LearnerProgressCard v-for="learner in learners" :key="learner._id" :learner="learner" />
        </ul>
      </section>
    </div>
  </DataState>
</template>
