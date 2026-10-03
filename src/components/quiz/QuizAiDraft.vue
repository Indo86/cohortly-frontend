<script setup>
import { computed, reactive, ref, useId } from 'vue'
import { useAddQuestion } from '@/composables/instructorMutations.js'
import { useAiStatusQuery, useGenerateQuizDraft } from '@/composables/aiQueries.js'
import { fieldErrors, normalizeError } from '@/services/apiError.js'
import { aiErrorMessage } from '@/utils/ai.js'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppInput from '@/components/ui/AppInput.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import QuestionEditor from './QuestionEditor.vue'

// "Generate with AI": an optional helper that DRAFTS quiz questions from the course text. The draft is only a
// suggestion that lives in this component. Nothing is saved until the instructor reviews it (edit or remove any
// question, untick the ones they do not want) and explicitly presses "Add selected questions to quiz". Those
// questions are then created one by one through the EXISTING quiz API (the same endpoint and validation as a
// manually typed question), so the AI has no write path of its own and cannot bypass quiz validation.
const MAX_FOCUS = 200

const props = defineProps({
  courseId: { type: String, required: true },
  quiz: { type: Object, required: true },
})

const uid = useId()
const courseId = computed(() => props.courseId)
const status = useAiStatusQuery()
const generateMutation = useGenerateQuizDraft(courseId)
const addMutation = useAddQuestion(courseId)

const enabled = computed(() => status.data.value?.enabled === true)
const available = computed(() => status.data.value?.available === true)

const open = ref(false)
const settings = reactive({ count: '5', focus: '' })
const settingErrors = reactive({ count: '', focus: '' })
const generateError = ref('')
const applyError = ref('')
const dropped = ref(0)
const generated = ref(false)
const drafts = ref([]) // [{ key, selected, question: { prompt, options: [{ _id, text, isCorrect }] } }]
const editingKey = ref(null)
const applying = ref(false)
let counter = 0

const selected = computed(() => drafts.value.filter((draft) => draft.selected))

const toDraft = (question) => {
  const key = `draft-${counter++}`

  return { key, selected: true, question: { prompt: question.prompt, options: question.options.map((option, index) => ({ _id: `${key}-o${index}`, text: option.text, isCorrect: option.isCorrect })) } }
}

const validate = () => {
  const typed = String(settings.count ?? '').trim()
  const count = Number(typed)

  settingErrors.count = typed !== '' && Number.isInteger(count) && count >= 1 && count <= 10 ? '' : 'Enter a whole number from 1 to 10.'
  settingErrors.focus = settings.focus.length > MAX_FOCUS ? `Keep the focus under ${MAX_FOCUS} characters.` : ''

  return !settingErrors.count && !settingErrors.focus
}

const generate = async () => {
  if (generateMutation.isPending.value || !validate()) return

  generateError.value = ''
  applyError.value = ''

  try {
    const result = await generateMutation.mutateAsync({ count: Number(settings.count), focus: settings.focus.trim() })

    drafts.value = result.questions.map(toDraft)
    dropped.value = result.dropped ?? 0
    generated.value = true
    editingKey.value = null
  } catch (caught) {
    generateError.value = aiErrorMessage(caught)
  }
}

const saveEdit = (draft, edited) => {
  draft.question = { prompt: edited.prompt, options: edited.options.map((option, index) => ({ _id: `${draft.key}-o${index}`, text: option.text, isCorrect: option.isCorrect })) }
  editingKey.value = null
}

const remove = (key) => {
  drafts.value = drafts.value.filter((draft) => draft.key !== key)

  if (editingKey.value === key) editingKey.value = null
}

const discard = () => {
  drafts.value = []
  generated.value = false
  editingKey.value = null
  applyError.value = ''
}

// The real quiz API, one question at a time, in order. A refusal stops here and keeps the rest of the draft.
const apply = async () => {
  if (applying.value || selected.value.length === 0) return

  applying.value = true
  applyError.value = ''

  try {
    const original = [...drafts.value] // numbers in messages refer to the draft as the instructor reviewed it

    for (const draft of [...selected.value]) {
      const number = original.indexOf(draft) + 1
      const body = { prompt: draft.question.prompt, options: draft.question.options.map(({ text, isCorrect }) => ({ text, isCorrect })) }

      try {
        await addMutation.mutateAsync({ quizId: props.quiz._id, question: body })
        drafts.value = drafts.value.filter((item) => item.key !== draft.key)
      } catch (caught) {
        const error = normalizeError(caught)
        const detail = Object.values(fieldErrors(error))[0] ?? error.message

        applyError.value = `Question ${number} was not added: ${detail}`

        return
      }
    }

    // every selected question was added; unselected ones stay in the draft for the instructor to decide
    if (drafts.value.length === 0) generated.value = false
  } finally {
    applying.value = false
  }
}
</script>

<template>
  <div v-if="enabled" class="mb-4" data-testid="quiz-ai-draft">
    <p v-if="!available" class="type-meta flex items-center gap-2" role="status">
      <AppIcon name="sparkles" class="h-4 w-4" />
      AI quiz drafting is temporarily unavailable.
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
        Generate with AI
      </button>

      <div v-if="open" :id="`${uid}-panel`" class="card mt-2 p-4 sm:p-5">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="type-card-title">Draft questions with AI</h3>
          <AppBadge tone="info">Draft</AppBadge>
        </div>
        <p class="type-body mt-2">
          Review generated questions before adding them to the quiz. The AI works from the text of your lessons (video lessons are not used)
          and can make mistakes. Nothing is saved until you add the questions you choose.
        </p>

        <form class="mt-4 flex flex-col gap-4 sm:max-w-xl" novalidate @submit.prevent="generate">
          <AppInput v-model="settings.count" label="Number of questions" type="number" required hint="From 1 to 10." :error="settingErrors.count" />
          <AppInput v-model="settings.focus" label="Focus (optional)" :hint="`A topic to concentrate on, for example “scope and closures”. ${settings.focus.length}/${MAX_FOCUS}`" :error="settingErrors.focus" />
          <div>
            <AppButton type="submit" :loading="generateMutation.isPending.value">Generate draft</AppButton>
            <span v-if="generateMutation.isPending.value" class="type-meta ml-3" role="status">Generating…</span>
          </div>
        </form>

        <InlineAlert v-if="generateError" tone="danger" title="The draft could not be created" class="mt-4">{{ generateError }}</InlineAlert>

        <section v-if="generated" class="mt-6" :aria-labelledby="`${uid}-draft-heading`" aria-live="polite">
          <div class="flex flex-wrap items-center gap-2">
            <h4 :id="`${uid}-draft-heading`" class="type-card-title">AI-generated draft</h4>
            <AppBadge>{{ drafts.length }} {{ drafts.length === 1 ? 'question' : 'questions' }}</AppBadge>
          </div>
          <p v-if="dropped > 0" class="type-help mt-1">{{ dropped }} {{ dropped === 1 ? 'suggestion was' : 'suggestions were' }} skipped because {{ dropped === 1 ? 'it' : 'they' }} could not be used.</p>

          <InlineAlert v-if="applyError" tone="danger" title="Not everything was added" class="mt-3">{{ applyError }}</InlineAlert>

          <ol class="mt-3 flex flex-col gap-3">
            <li v-for="(draft, index) in drafts" :key="draft.key" class="rounded-control border border-line p-4">
              <QuestionEditor
                v-if="editingKey === draft.key"
                :question="draft.question"
                @submit="(edited) => saveEdit(draft, edited)"
                @cancel="editingKey = null"
              />
              <template v-else>
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                    <input v-model="draft.selected" type="checkbox" class="mt-1 h-5 w-5 shrink-0 accent-primary" :aria-label="`Include draft question ${index + 1}`">
                    <span class="min-w-0">
                      <span class="type-eyebrow block">Draft question {{ index + 1 }}</span>
                      <span class="type-card-title mt-1 block break-words">{{ draft.question.prompt }}</span>
                    </span>
                  </label>
                  <div class="flex flex-wrap gap-2">
                    <AppButton variant="secondary" :aria-label="`Edit draft question ${index + 1}`" @click="editingKey = draft.key">Edit</AppButton>
                    <AppButton variant="danger-quiet" :aria-label="`Remove draft question ${index + 1}`" @click="remove(draft.key)">Remove</AppButton>
                  </div>
                </div>
                <ul class="mt-3 flex flex-col gap-1.5">
                  <li v-for="option in draft.question.options" :key="option._id" class="flex items-start gap-2 text-sm text-ink">
                    <AppIcon :name="option.isCorrect ? 'check-circle' : 'circle'" class="mt-0.5 h-4 w-4 shrink-0" :class="option.isCorrect ? 'text-success' : 'text-ink-muted'" />
                    <span class="min-w-0 break-words">{{ option.text }}</span>
                    <AppBadge v-if="option.isCorrect" tone="success">Correct</AppBadge>
                  </li>
                </ul>
              </template>
            </li>
          </ol>

          <p v-if="drafts.length === 0" class="type-meta mt-3">No draft questions left.</p>

          <div class="mt-4 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <AppButton variant="ghost" :disabled="applying" @click="discard">Discard draft</AppButton>
            <AppButton :loading="applying" :disabled="selected.length === 0" @click="apply">
              Add {{ selected.length }} selected {{ selected.length === 1 ? 'question' : 'questions' }} to quiz
            </AppButton>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
