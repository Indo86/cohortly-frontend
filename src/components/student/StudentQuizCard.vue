<script setup>
import { computed } from 'vue'
import { certificateRoute, quizRoute } from '@/utils/studentCourse.js'
import { formatDateTime } from '@/utils/date.js'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

// The final quiz as the student sees it on the course page. The state is the BACKEND's
// (quiz.state: locked | not-ready | available | passed); the scores are the backend's too. Nothing
// is computed here.
const props = defineProps({
  courseId: { type: String, required: true },
  quiz: { type: Object, required: true }, // course.quiz
  certificate: { type: Object, default: null },
})

const latest = computed(() => props.quiz.latestAttempt)
const latestDate = computed(() => formatDateTime(latest.value?.submittedAt))
</script>

<template>
  <section class="card p-4 sm:p-6" aria-labelledby="quiz-card-heading" data-testid="quiz-card">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <AppIcon name="quiz" class="h-6 w-6 text-primary" />
      <h2 id="quiz-card-heading" class="type-card-title">Final quiz</h2>
      <AppBadge v-if="quiz.state === 'passed'" tone="success">Passed</AppBadge>
      <AppBadge v-else-if="quiz.state === 'locked'">Locked</AppBadge>
      <AppBadge v-else-if="quiz.state === 'not-ready'">Not available yet</AppBadge>
      <AppBadge v-else-if="quiz.attempts > 0" tone="warning">Not passed yet</AppBadge>
      <AppBadge v-else tone="info">Ready</AppBadge>
    </div>

    <p class="type-meta mt-2">
      {{ quiz.title }} · {{ quiz.totalQuestions }} {{ quiz.totalQuestions === 1 ? 'question' : 'questions' }} · Passing score: {{ quiz.passingScore }}%
    </p>

    <p v-if="quiz.state === 'locked'" class="type-body mt-3">Complete all lessons to unlock the final quiz.</p>
    <p v-else-if="quiz.state === 'not-ready'" class="type-body mt-3">Your instructor is still preparing the final quiz. It will appear here when it is ready.</p>
    <p v-else-if="quiz.state === 'passed'" class="type-body mt-3">
      You passed the final quiz with {{ quiz.bestScore }}%. Taking it again never changes your result or your certificate.
    </p>
    <p v-else-if="latest" class="type-body mt-3">
      Your latest attempt scored {{ latest.score }}% on {{ latestDate }}, below the passing score. You can retry as many times as you like.
    </p>
    <p v-else class="type-body mt-3">You have completed every lesson. Pass the final quiz to complete the course.</p>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <AppButton v-if="quiz.state === 'available'" :to="quizRoute(courseId)">
        {{ quiz.attempts > 0 ? 'Retry final quiz' : 'Take final quiz' }}
        <AppIcon name="arrow-right" class="h-4 w-4" />
      </AppButton>
      <AppButton v-else-if="quiz.state === 'passed'" variant="secondary" :to="quizRoute(courseId)">Take the quiz again</AppButton>
      <AppButton v-if="certificate" variant="secondary" :to="certificateRoute(certificate.certificateNumber)">
        <AppIcon name="certificate" class="h-4 w-4" />
        View certificate
      </AppButton>
    </div>
  </section>
</template>
