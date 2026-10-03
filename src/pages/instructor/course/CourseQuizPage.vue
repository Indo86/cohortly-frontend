<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useCourseQuery, useCourseQuizQuery } from '@/composables/instructorQueries.js'
import { useAddQuestion, useCreateQuiz, useDeleteQuiz, useReorderQuestions, useUpdateQuiz } from '@/composables/instructorMutations.js'
import { useRouteParam } from '@/composables/useRouteParam.js'
import { ErrorKind, fieldErrors, normalizeError } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppInput from '@/components/ui/AppInput.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import DataState from '@/components/feedback/DataState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import QuestionEditor from '@/components/quiz/QuestionEditor.vue'
import QuizAiDraft from '@/components/quiz/QuizAiDraft.vue'
import QuizQuestionCard from '@/components/quiz/QuizQuestionCard.vue'

// Quiz tab: the course's ONE optional final quiz. Everything shown (readiness, problems, which
// option is correct) is the backend's; this page only edits and displays. Students never see the
// answer key: it exists only in this instructor view.
const courseId = useRouteParam('courseId')
const course = useCourseQuery(courseId)
const quizQuery = useCourseQuizQuery(courseId)
const create = useCreateQuiz(courseId)
const update = useUpdateQuiz(courseId)
const remove = useDeleteQuiz(courseId)
const addQuestion = useAddQuestion(courseId)
const reorder = useReorderQuestions(courseId)

const quiz = computed(() => quizQuery.data.value ?? null)

// ---- settings (create and edit share one form) ----
// (a number input hands v-model a Number once it holds a number, so the score is always read as text)
const settings = reactive({ title: 'Final quiz', passingScore: '70' })
const settingsErrors = reactive({ title: '', passingScore: '' })
const synced = ref('')

// the form follows the stored quiz (once per quiz version that arrives)
const syncSettings = () => {
  if (quiz.value && synced.value !== `${quiz.value._id}:${quiz.value.updatedAt}`) {
    settings.title = quiz.value.title
    settings.passingScore = String(quiz.value.passingScore)
    synced.value = `${quiz.value._id}:${quiz.value.updatedAt}`
  }
}

const settingsServerFields = computed(() => fieldErrors((quiz.value ? update : create).error.value))
const settingsError = (field) => settingsErrors[field] || settingsServerFields.value[field] || ''
const settingsMessage = computed(() => {
  const failure = (quiz.value ? update : create).error.value

  if (!failure) return ''
  if (failure.kind === ErrorKind.VALIDATION && Object.keys(settingsServerFields.value).length) return ''

  return failure.message
})

const validateSettings = () => {
  const typed = String(settings.passingScore ?? '').trim()
  const score = Number(typed)

  settingsErrors.title = settings.title.trim().length >= 3 ? '' : 'Enter a title of at least 3 characters.'
  settingsErrors.passingScore =
    typed !== '' && Number.isInteger(score) && score >= 1 && score <= 100
      ? ''
      : 'Enter a whole number from 1 to 100.'

  return !settingsErrors.title && !settingsErrors.passingScore
}

const saveSettings = async () => {
  if (!validateSettings()) return

  const values = { title: settings.title.trim(), passingScore: Number(settings.passingScore) }

  try {
    if (quiz.value) await update.mutateAsync({ quizId: quiz.value._id, settings: values })
    else await create.mutateAsync(values)
  } catch {
    // shown by the form
  }
}

watch(quiz, syncSettings, { immediate: true })

// ---- delete the quiz ----
const confirmDeleteQuiz = ref(false)
const deleteError = ref('')

const deleteQuiz = async () => {
  deleteError.value = ''

  try {
    await remove.mutateAsync(quiz.value._id)
    confirmDeleteQuiz.value = false
    synced.value = ''
    settings.title = 'Final quiz'
    settings.passingScore = '70'
  } catch (caught) {
    deleteError.value = normalizeError(caught).message
  }
}

// ---- questions ----
const adding = ref(false)
const reorderMessage = ref('')

const submitNew = async (question) => {
  try {
    await addQuestion.mutateAsync({ quizId: quiz.value._id, question })
    adding.value = false
  } catch {
    // shown by the editor
  }
}

const moveQuestion = async (index, delta) => {
  const ids = quiz.value.questions.map((question) => question._id)
  const target = index + delta

  if (target < 0 || target >= ids.length) return
  ;[ids[index], ids[target]] = [ids[target], ids[index]]
  reorderMessage.value = ''

  try {
    await reorder.mutateAsync({ quizId: quiz.value._id, questionIds: ids })
  } catch (caught) {
    const error = normalizeError(caught)

    reorderMessage.value =
      error.code === 'REORDER_MISMATCH'
        ? 'The questions changed elsewhere, so the current order was reloaded. Please try again.'
        : error.message
  }
}

const published = computed(() => course.data.value?.status === 'published')
</script>

<template>
  <DataState
    :pending="quizQuery.isPending.value"
    :error="quizQuery.error.value"
    subject="the final quiz"
    loading-label="Loading the final quiz…"
    @retry="quizQuery.refetch()"
  >
    <!-- no quiz yet: explain it and offer to create one -->
    <div v-if="!quiz" class="flex max-w-3xl flex-col gap-6">
      <EmptyState
        title="This course has no final quiz"
        description="A final quiz is optional. Without one, students complete the course when they finish every lesson. With one, they must also pass it."
        icon="quiz"
      />

      <AppCard>
        <SectionHeader title="Create a final quiz" description="One single-answer multiple-choice quiz per course. You add the questions next." />
        <form class="flex flex-col gap-5" novalidate @submit.prevent="saveSettings">
          <InlineAlert v-if="settingsMessage" tone="danger">{{ settingsMessage }}</InlineAlert>
          <AppInput v-model="settings.title" label="Quiz title" required :error="settingsError('title')" />
          <AppInput
            v-model="settings.passingScore"
            label="Passing score (%)"
            type="number"
            required
            hint="The score students must reach to pass: a whole number from 1 to 100."
            :error="settingsError('passingScore')"
          />
          <div>
            <AppButton type="submit" :loading="create.isPending.value">Create quiz</AppButton>
          </div>
        </form>
      </AppCard>
    </div>

    <div v-else class="flex max-w-3xl flex-col gap-6">
      <!-- readiness -->
      <InlineAlert
        v-if="!quiz.ready"
        tone="warning"
        title="Students cannot take this quiz yet"
      >
        <ul class="list-disc pl-5">
          <li v-for="problem in quiz.problems" :key="`${problem.code}-${problem.questionId ?? ''}`">{{ problem.message }}</li>
        </ul>
        <p class="mt-2">
          {{ published
            ? 'Until it is finished, learners cannot complete this course.'
            : 'The course cannot be published until the quiz is finished.' }}
        </p>
      </InlineAlert>
      <InlineAlert v-else tone="success" title="The quiz is ready">
        Students unlock it after completing every lesson. They complete the course when every lesson is done and they have passed
        the quiz with at least {{ quiz.passingScore }}%.
      </InlineAlert>

      <!-- settings -->
      <AppCard>
        <SectionHeader title="Quiz settings" />
        <form class="flex flex-col gap-5" novalidate @submit.prevent="saveSettings">
          <InlineAlert v-if="settingsMessage" tone="danger">{{ settingsMessage }}</InlineAlert>
          <AppInput v-model="settings.title" label="Quiz title" required :error="settingsError('title')" />
          <AppInput
            v-model="settings.passingScore"
            label="Passing score (%)"
            type="number"
            required
            hint="Students may retry as often as they like. Questions count equally; the score is rounded down."
            :error="settingsError('passingScore')"
          />
          <div class="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-between">
            <AppButton variant="danger-outline" @click="confirmDeleteQuiz = true">Delete quiz</AppButton>
            <AppButton type="submit" :loading="update.isPending.value">Save settings</AppButton>
          </div>
        </form>
      </AppCard>

      <!-- questions -->
      <section aria-labelledby="questions-heading">
        <SectionHeader id="questions-heading" :title="`Questions (${quiz.totalQuestions})`" description="Each question has one correct answer.">
          <template #actions>
            <AppButton v-if="!adding" variant="secondary" @click="adding = true">
              <AppIcon name="plus" class="h-4 w-4" />
              Add question
            </AppButton>
          </template>
        </SectionHeader>

        <!-- optional: AI drafts questions; the instructor reviews and applies them through the normal quiz API -->
        <QuizAiDraft :course-id="courseId" :quiz="quiz" />

        <InlineAlert v-if="reorderMessage" tone="warning" class="mb-4">{{ reorderMessage }}</InlineAlert>

        <ol v-if="quiz.questions.length > 0" class="flex flex-col gap-4">
          <QuizQuestionCard
            v-for="(question, index) in quiz.questions"
            :key="question._id"
            :course-id="courseId"
            :quiz-id="quiz._id"
            :question="question"
            :index="index"
            :total="quiz.questions.length"
            :busy="reorder.isPending.value"
            @move="(delta) => moveQuestion(index, delta)"
          />
        </ol>
        <EmptyState
          v-else-if="!adding"
          title="No questions yet"
          description="Add at least one question. Each needs two or more options and one correct answer."
          icon="quiz"
        >
          <AppButton @click="adding = true">Add the first question</AppButton>
        </EmptyState>

        <AppCard v-if="adding" as="div" class="mt-4">
          <QuestionEditor
            :pending="addQuestion.isPending.value"
            :server-error="addQuestion.error.value"
            @submit="submitNew"
            @cancel="adding = false; addQuestion.reset()"
          />
        </AppCard>
      </section>
    </div>

    <ConfirmDialog
      :open="confirmDeleteQuiz"
      title="Delete the final quiz?"
      confirm-label="Delete quiz"
      :loading="remove.isPending.value"
      :error="deleteError"
      @confirm="deleteQuiz"
      @cancel="confirmDeleteQuiz = false; deleteError = ''"
    >
      <p>The quiz and its questions are removed. Students will no longer need to pass it.</p>
      <p>Learners who have finished every lesson complete the course and receive their certificate. Submitted attempts are kept as history, and certificates already issued are not affected.</p>
    </ConfirmDialog>
  </DataState>
</template>
