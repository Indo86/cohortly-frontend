<script setup>
import { computed, ref, useId } from 'vue'
import { useAiStatusQuery, useAskLessonQuestion, useGeneratePractice, useLessonSummary } from '@/composables/aiQueries.js'
import { aiErrorMessage } from '@/utils/ai.js'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import PracticeQuestions from './PracticeQuestions.vue'

// A small, optional AI study assistant under the lesson. It is secondary on purpose: collapsed by default,
// hidden entirely when AI is turned off, and every failure stays inside this panel (the lesson, its completion
// buttons and the navigation never depend on it). The student can summarize the lesson, ask a question about it,
// or generate practice questions. All of it is generated text that may be wrong, and none of it changes progress.
const MAX_QUESTION = 500
const MIN_QUESTION = 3

const props = defineProps({
  courseId: { type: String, required: true },
  lessonId: { type: String, required: true },
  lessonType: { type: String, default: 'text' },
})

const uid = useId()
const courseId = computed(() => props.courseId)
const lessonId = computed(() => props.lessonId)

const status = useAiStatusQuery()
const askMutation = useAskLessonQuestion(courseId, lessonId)
const summaryMutation = useLessonSummary(courseId, lessonId)
const practiceMutation = useGeneratePractice(courseId, lessonId)

const open = ref(false)
const question = ref('')
const questionError = ref('')
const answer = ref(null)
const summary = ref(null)
const practice = ref(null)
const practiceRun = ref(0) // a new set of questions starts with a fresh practice state
const errors = ref({ ask: '', summary: '', practice: '' })

// one AI request at a time (the backend allows one per user as well), so repeated clicks cannot pile up
const busy = computed(() => askMutation.isPending.value || summaryMutation.isPending.value || practiceMutation.isPending.value)

const enabled = computed(() => status.data.value?.enabled === true)
const available = computed(() => status.data.value?.available === true)
const textLesson = computed(() => props.lessonType === 'text')

const run = async (key, mutation, onSuccess, argument) => {
  if (busy.value) return

  errors.value = { ...errors.value, [key]: '' }

  try {
    onSuccess(await mutation.mutateAsync(argument))
  } catch (caught) {
    errors.value = { ...errors.value, [key]: aiErrorMessage(caught) }
  }
}

const ask = async () => {
  const text = question.value.trim()

  questionError.value = text.length < MIN_QUESTION ? `Ask a question of at least ${MIN_QUESTION} characters.` : ''

  if (questionError.value) return

  await run('ask', askMutation, (result) => { answer.value = { ...result, question: text } }, text)
}

const summarize = () => run('summary', summaryMutation, (result) => { summary.value = result })
const generate = () => run('practice', practiceMutation, (result) => { practiceRun.value += 1; practice.value = result.questions })
</script>

<template>
  <!-- AI is optional: nothing at all while it is off or its state is unknown -->
  <section v-if="enabled" class="mt-10 border-t border-line pt-6 print:hidden" aria-labelledby="ai-tools-heading" data-testid="lesson-assistant">
    <h2 id="ai-tools-heading" class="sr-only">AI study tools</h2>

    <p v-if="!available" class="type-meta flex items-center gap-2" role="status">
      <AppIcon name="sparkles" class="h-4 w-4" />
      AI study tools are temporarily unavailable.
    </p>
    <p v-else-if="!textLesson" class="type-meta flex items-center gap-2">
      <AppIcon name="sparkles" class="h-4 w-4" />
      AI study tools work from lesson text, so they are not available for video lessons.
    </p>

    <template v-else>
      <button
        type="button"
        class="inline-flex min-h-[2.75rem] items-center gap-2 rounded-control px-3 text-sm font-semibold text-primary-hover hover:bg-primary-faint"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="`${uid}-panel`"
        @click="open = !open"
      >
        <AppIcon name="sparkles" class="h-4 w-4" />
        AI study tools
        <AppIcon :name="open ? 'close' : 'plus'" class="h-4 w-4" />
      </button>

      <div v-if="open" :id="`${uid}-panel`" class="card mt-3 p-4 sm:p-5">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="type-card-title">AI study assistant</h3>
          <AppBadge tone="info">Based on this lesson</AppBadge>
        </div>
        <p class="type-help mt-1">AI-generated content can be wrong. Review it before relying on it.</p>

        <div class="mt-4 flex flex-wrap gap-2">
          <AppButton variant="secondary" :loading="summaryMutation.isPending.value" :disabled="busy || summary !== null" @click="summarize">Summarize lesson</AppButton>
          <AppButton variant="secondary" :loading="practiceMutation.isPending.value" :disabled="busy || practice !== null" @click="generate">Practice questions</AppButton>
        </div>

        <form class="mt-5" novalidate @submit.prevent="ask">
          <label :for="`${uid}-question`" class="type-label">Ask about this lesson</label>
          <textarea
            :id="`${uid}-question`"
            v-model="question"
            rows="2"
            :maxlength="MAX_QUESTION"
            class="field-control mt-1.5"
            :aria-invalid="questionError ? 'true' : undefined"
            :aria-describedby="`${uid}-question-help${questionError ? ` ${uid}-question-error` : ''}`"
          />
          <div class="mt-1 flex flex-wrap items-start justify-between gap-2">
            <p :id="`${uid}-question-help`" class="type-help">{{ question.length }} / {{ MAX_QUESTION }} characters</p>
            <p v-if="questionError" :id="`${uid}-question-error`" class="type-error" role="alert">{{ questionError }}</p>
          </div>
          <div class="mt-3">
            <AppButton type="submit" :loading="askMutation.isPending.value" :disabled="busy">Ask</AppButton>
          </div>
        </form>

        <p v-if="busy" class="type-meta mt-4" role="status">Generating…</p>

        <!-- results: announced politely, each labelled as AI-generated -->
        <div class="mt-4 flex flex-col gap-4" aria-live="polite">
          <InlineAlert v-if="errors.ask" tone="danger" title="The question could not be answered">{{ errors.ask }}</InlineAlert>
          <InlineAlert v-if="errors.summary" tone="danger" title="The summary could not be created">{{ errors.summary }}</InlineAlert>
          <InlineAlert v-if="errors.practice" tone="danger" title="Practice questions could not be created">{{ errors.practice }}</InlineAlert>

          <section v-if="answer" class="rounded-control border border-line p-4" data-testid="ai-answer">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="type-card-title">AI-generated answer</h3>
              <AppBadge :tone="answer.groundedInLesson ? 'success' : 'warning'">
                {{ answer.groundedInLesson ? 'Based on this lesson' : 'The lesson may not cover this' }}
              </AppBadge>
            </div>
            <p class="type-help mt-1">Your question: {{ answer.question }}</p>
            <p class="type-body mt-3 whitespace-pre-line break-words">{{ answer.answer }}</p>
          </section>

          <section v-if="summary" class="rounded-control border border-line p-4" data-testid="ai-summary">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="type-card-title">AI-generated summary</h3>
              <AppBadge tone="info">Based on this lesson</AppBadge>
            </div>
            <p class="type-body mt-3 whitespace-pre-line break-words">{{ summary.summary }}</p>
          </section>

          <PracticeQuestions v-if="practice" :key="practiceRun" :questions="practice" :pending="practiceMutation.isPending.value" @regenerate="() => { practice = null; generate() }" />
        </div>
      </div>
    </template>
  </section>
</template>
