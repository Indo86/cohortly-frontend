<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useSubmitQuiz } from '@/composables/studentMutations.js'
import { useQuizAttemptsQuery, useStudentCourseQuery, useStudentQuizQuery } from '@/composables/studentQueries.js'
import { ErrorKind, normalizeError } from '@/services/apiError.js'
import { formatDateTime } from '@/utils/date.js'
import { certificateRoute, courseRoute } from '@/utils/studentCourse.js'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import StudentQueryState from '@/components/student/StudentQueryState.vue'

// The final quiz. The student only CHOOSES options; the backend scores the attempt, decides pass or
// fail, completes the course and issues the certificate. What is shown after submitting (score,
// passed, right/wrong per question, certificate) is that answer, never a local calculation. The
// quiz itself never contains the answer key.
const props = defineProps({
  courseId: { type: String, required: true },
})

const courseId = computed(() => props.courseId)
const quizQuery = useStudentQuizQuery(courseId)
const attemptsQuery = useQuizAttemptsQuery(courseId)
const courseQuery = useStudentCourseQuery(courseId)
const submit = useSubmitQuiz(courseId)

const quiz = computed(() => quizQuery.data.value ?? null)
const questions = computed(() => quiz.value?.questions ?? [])
const attempts = computed(() => attemptsQuery.data.value ?? [])
const course = computed(() => courseQuery.data.value ?? null)

// ---- the safe business answers of the backend ----
const lockCode = computed(() => (quizQuery.error.value?.kind === ErrorKind.CONFLICT ? quizQuery.error.value.code : null))
const noQuiz = computed(() => quizQuery.error.value?.kind === ErrorKind.NOT_FOUND && quizQuery.error.value.code === 'QUIZ_NOT_FOUND')

// ---- answering ----
const answers = reactive({}) // questionId -> optionId; kept if a submit fails
const showMissing = ref(false)
const summary = ref(null)
const failure = ref('')

const missing = computed(() => questions.value.filter((question) => !answers[question._id]))

// ---- result (the backend's answer to the last submit) ----
const result = ref(null)
const resultHeading = ref(null)

const resultRows = computed(() => {
  const byQuestion = new Map((result.value?.results ?? []).map((item) => [item.questionId, item.correct]))

  return questions.value.map((question, index) => ({ id: question._id, number: index + 1, prompt: question.prompt, correct: byQuestion.get(question._id) }))
})

const send = async () => {
  if (submit.isPending.value) return

  failure.value = ''
  showMissing.value = missing.value.length > 0

  if (showMissing.value) {
    await nextTick()
    summary.value?.focus()

    return
  }

  try {
    result.value = await submit.mutateAsync(questions.value.map((question) => ({ questionId: question._id, optionId: answers[question._id] })))
    await nextTick()
    resultHeading.value?.focus()
  } catch (caught) {
    // the choices stay exactly as they were so the student can simply try again
    failure.value = normalizeError(caught).message
  }
}

const retry = () => {
  for (const key of Object.keys(answers)) delete answers[key]

  result.value = null
  showMissing.value = false
  failure.value = ''
}

const passedBefore = computed(() => course.value?.quiz?.passed ?? false)
</script>

<template>
  <div class="mx-auto max-w-reading">
    <nav aria-label="Breadcrumb" class="mb-4 text-sm">
      <RouterLink :to="courseRoute(courseId)" class="back-link">← {{ course ? `Back to ${course.name}` : 'Back to the course' }}</RouterLink>
    </nav>

    <!-- locked / not ready / no quiz: explained, not an error screen -->
    <EmptyState
      v-if="lockCode === 'QUIZ_LOCKED'"
      :level="1"
      icon="lock"
      title="The final quiz is locked"
      description="Complete all lessons to unlock the final quiz."
    >
      <AppButton :to="courseRoute(courseId)">Back to the course</AppButton>
    </EmptyState>
    <EmptyState
      v-else-if="lockCode === 'QUIZ_NOT_READY'"
      :level="1"
      icon="quiz"
      title="The final quiz is not available yet"
      description="Your instructor is still preparing it. It will be here when it is ready."
    >
      <AppButton :to="courseRoute(courseId)">Back to the course</AppButton>
    </EmptyState>
    <EmptyState
      v-else-if="noQuiz"
      :level="1"
      icon="quiz"
      title="This course has no final quiz"
      description="You complete this course by finishing its lessons."
    >
      <AppButton :to="courseRoute(courseId)">Back to the course</AppButton>
    </EmptyState>

    <StudentQueryState
      v-else
      :pending="quizQuery.isPending.value"
      :error="quizQuery.error.value"
      :empty="false"
      subject="the final quiz"
      loading-label="Loading the final quiz…"
      unavailable-title="This course is no longer available"
      unavailable-description="It may have been unpublished, or you may no longer be enrolled. Your other courses are not affected."
      @retry="quizQuery.refetch()"
    >
      <template v-if="quiz">
        <!-- ======= RESULT ======= -->
        <section v-if="result" aria-labelledby="result-heading" data-testid="quiz-result">
          <AppCard>
            <div class="flex items-center gap-3">
              <AppIcon :name="result.passed ? 'check-circle' : 'quiz'" class="h-8 w-8" :class="result.passed ? 'text-success' : 'text-primary'" />
              <h1 id="result-heading" ref="resultHeading" tabindex="-1" class="type-page-title">
                {{ result.passed ? 'You passed' : 'Not passed this time' }}
              </h1>
            </div>

            <p class="mt-4 text-3xl font-bold tracking-tight text-ink" data-testid="quiz-score">{{ result.score }}%</p>
            <p class="type-meta mt-1">
              {{ result.correctAnswers }} of {{ result.totalQuestions }} correct · Passing score: {{ result.passingScore }}%
            </p>

            <InlineAlert v-if="result.passed && result.courseCompleted" tone="success" title="Course completed" class="mt-5">
              You have finished every lesson and passed the final quiz.
              <span v-if="result.certificate">Your certificate is ready.</span>
            </InlineAlert>
            <InlineAlert v-else-if="result.passed" tone="info" class="mt-5">
              You passed the quiz. Finish the remaining lessons to complete the course.
            </InlineAlert>
            <p v-else class="type-body mt-5">
              You need at least {{ result.passingScore }}% to pass. Review the lessons if you like and try again. You can retry as many times as you want.
            </p>

            <div class="mt-6 flex flex-wrap gap-3">
              <AppButton v-if="result.certificate" :to="certificateRoute(result.certificate.certificateNumber)">
                <AppIcon name="certificate" class="h-4 w-4" />
                View certificate
              </AppButton>
              <AppButton v-if="!result.passed" @click="retry">Retry quiz</AppButton>
              <AppButton variant="secondary" :to="courseRoute(courseId)">Back to the course</AppButton>
            </div>
          </AppCard>

          <section class="mt-8" aria-labelledby="review-heading">
            <SectionHeader id="review-heading" title="Your answers" description="Which of your answers were correct. The correct options are not shown." />
            <ol class="card divide-y divide-line">
              <li v-for="row in resultRows" :key="row.id" class="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5">
                <p class="min-w-0 flex-1 break-words text-sm text-ink"><span class="text-ink-muted">{{ row.number }}.</span> {{ row.prompt }}</p>
                <AppBadge :tone="row.correct ? 'success' : 'neutral'">{{ row.correct ? 'Correct' : 'Not correct' }}</AppBadge>
              </li>
            </ol>
          </section>
        </section>

        <!-- ======= THE QUIZ ======= -->
        <template v-else>
          <header class="mb-6">
            <p class="type-eyebrow">Final quiz</p>
            <h1 class="type-page-title mt-1 break-words">{{ quiz.title }}</h1>
            <p class="type-meta mt-2">
              {{ quiz.totalQuestions }} {{ quiz.totalQuestions === 1 ? 'question' : 'questions' }} · Passing score: {{ quiz.passingScore }}%
            </p>
            <p class="type-body mt-3">
              Choose one answer for every question, then submit. You can retry as often as you like; each attempt is saved.
            </p>
          </header>

          <InlineAlert v-if="passedBefore" tone="success" title="You have already passed this quiz" class="mb-6">
            Taking it again does not change your result or your certificate.
          </InlineAlert>

          <InlineAlert v-if="failure" tone="danger" title="Your answers were not submitted" class="mb-6">
            {{ failure }} Your choices are still here: try again.
          </InlineAlert>

          <div
            v-if="showMissing && missing.length > 0"
            ref="summary"
            tabindex="-1"
            class="mb-6 rounded-control border border-danger/30 bg-danger-soft/70 px-4 py-3 text-sm text-danger-strong"
            role="alert"
            data-testid="quiz-error-summary"
          >
            <p class="font-semibold">Answer every question before submitting</p>
            <ul class="mt-1 list-disc pl-5">
              <li v-for="question in missing" :key="question._id">
                <a :href="`#question-${question._id}`" class="underline">{{ question.prompt }}</a>
              </li>
            </ul>
          </div>

          <form class="flex flex-col gap-6" novalidate @submit.prevent="send">
            <fieldset
              v-for="(question, index) in questions"
              :id="`question-${question._id}`"
              :key="question._id"
              class="card p-4 sm:p-5"
              :aria-describedby="showMissing && !answers[question._id] ? `error-${question._id}` : undefined"
            >
              <legend class="type-card-title float-left mb-3 w-full break-words">
                <span class="text-ink-muted">{{ index + 1 }}.</span> {{ question.prompt }}
              </legend>

              <div class="clear-both flex flex-col gap-2">
                <label
                  v-for="option in question.options"
                  :key="option._id"
                  class="flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-control border px-4 py-3 text-sm text-ink transition-colors hover:bg-surface-muted"
                  :class="answers[question._id] === option._id ? 'border-primary bg-primary-faint' : 'border-line-control'"
                >
                  <input v-model="answers[question._id]" type="radio" :name="`question-${question._id}`" :value="option._id" class="h-5 w-5 shrink-0 accent-primary">
                  <span class="min-w-0 break-words">{{ option.text }}</span>
                </label>
              </div>

              <p v-if="showMissing && !answers[question._id]" :id="`error-${question._id}`" class="type-error mt-3">Choose an answer for this question.</p>
            </fieldset>

            <div class="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p class="type-meta" aria-live="polite">{{ questions.length - missing.length }} of {{ questions.length }} answered</p>
              <AppButton type="submit" :loading="submit.isPending.value">Submit answers</AppButton>
            </div>
          </form>
        </template>

        <!-- ======= HISTORY ======= -->
        <section v-if="attempts.length > 0" class="mt-10" aria-labelledby="history-heading">
          <SectionHeader id="history-heading" title="Your attempts" />
          <ol class="card divide-y divide-line">
            <li v-for="attempt in attempts" :key="attempt._id" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
              <p class="text-sm font-medium text-ink">Attempt {{ attempt.attemptNumber }}</p>
              <p class="type-meta">{{ formatDateTime(attempt.submittedAt) }}</p>
              <p class="text-sm text-ink">{{ attempt.score }}%</p>
              <AppBadge :tone="attempt.passed ? 'success' : 'neutral'">{{ attempt.passed ? 'Passed' : 'Not passed' }}</AppBadge>
            </li>
          </ol>
        </section>
      </template>
    </StudentQueryState>
  </div>
</template>
