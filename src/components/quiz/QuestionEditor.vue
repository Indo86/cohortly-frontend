<script setup>
import { computed, reactive, ref, useId } from 'vue'
import { fieldErrors } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// Create or edit ONE single-answer question: the question text, 2 to 8 options, and a radio that
// marks the correct one. Options keep the stable id the backend gave them (so the correct answer
// follows its option when options are edited or removed); new options have none yet. The checks
// here only save a round trip: the backend validates again and is authoritative.
const MIN_OPTIONS = 2
const MAX_OPTIONS = 8

const props = defineProps({
  question: { type: Object, default: null }, // { _id, prompt, options: [{ _id, text, isCorrect }] } when editing
  pending: { type: Boolean, default: false },
  serverError: { type: Object, default: null },
})

const emit = defineEmits(['submit', 'cancel'])

const uid = useId()
let counter = 0
const blank = () => ({ key: `new-${counter++}`, id: undefined, text: '' })

const prompt = ref(props.question?.prompt ?? '')
const options = reactive(
  props.question
    ? props.question.options.map((option) => ({ key: option._id, id: option._id, text: option.text }))
    : [blank(), blank(), blank(), blank()]
)
const correct = ref(props.question?.options.find((option) => option.isCorrect)?._id ?? '')
const errors = reactive({ prompt: '', options: [], correct: '', general: '' })

const server = computed(() => fieldErrors(props.serverError))
const generalServerMessage = computed(() => {
  const failure = props.serverError

  if (!failure) return ''

  // field problems are shown next to the fields; anything else is shown once here
  return Object.keys(server.value).length > 0 ? '' : failure.message
})

const canAdd = computed(() => options.length < MAX_OPTIONS)
const canRemove = computed(() => options.length > MIN_OPTIONS)

const addOption = () => {
  if (canAdd.value) options.push(blank())
}

const removeOption = (index) => {
  if (!canRemove.value) return

  const [removed] = options.splice(index, 1)

  if (correct.value === removed.key) correct.value = ''
}

const validate = () => {
  errors.prompt = prompt.value.trim().length >= 3 ? '' : 'Enter the question text (at least 3 characters).'
  errors.options = options.map((option) => (option.text.trim() ? '' : 'Enter the option text, or remove this option.'))
  errors.general = ''
  errors.correct = correct.value ? '' : 'Choose which option is correct.'

  const texts = options.map((option) => option.text.trim().toLowerCase()).filter(Boolean)

  if (new Set(texts).size !== texts.length) errors.general = 'Each option must be different from the others.'

  return !errors.prompt && errors.options.every((message) => !message) && !errors.correct && !errors.general
}

const submit = () => {
  if (!validate()) return

  emit('submit', {
    prompt: prompt.value.trim(),
    options: options.map((option) => ({
      ...(option.id ? { id: option.id } : {}),
      text: option.text.trim(),
      isCorrect: option.key === correct.value,
    })),
  })
}
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="submit">
    <InlineAlert v-if="generalServerMessage" tone="danger">{{ generalServerMessage }}</InlineAlert>

    <AppTextarea
      v-model="prompt"
      :label="question ? 'Question' : 'New question'"
      :rows="3"
      required
      :error="errors.prompt || server.prompt || ''"
    />

    <fieldset class="flex flex-col gap-3" :aria-describedby="`${uid}-options-help`">
      <legend class="type-label">Answer options <span class="text-danger" aria-hidden="true">*</span></legend>
      <p :id="`${uid}-options-help`" class="type-help">Choose the radio button of the one correct option. Students see the options in this order.</p>

      <ul class="flex flex-col gap-3">
        <li v-for="(option, index) in options" :key="option.key" class="flex items-start gap-3">
          <input
            v-model="correct"
            type="radio"
            :name="`${uid}-correct`"
            :value="option.key"
            :aria-label="`Option ${index + 1} is the correct answer`"
            class="mt-3 h-5 w-5 shrink-0 accent-primary"
          >
          <div class="min-w-0 flex-1">
            <label :for="`${uid}-option-${option.key}`" class="sr-only">Option {{ index + 1 }}</label>
            <input
              :id="`${uid}-option-${option.key}`"
              v-model="option.text"
              type="text"
              :placeholder="`Option ${index + 1}`"
              :aria-invalid="errors.options[index] ? 'true' : undefined"
              :aria-describedby="errors.options[index] ? `${uid}-option-${option.key}-error` : undefined"
              class="field-control"
            >
            <p v-if="errors.options[index]" :id="`${uid}-option-${option.key}-error`" class="type-error mt-1">{{ errors.options[index] }}</p>
          </div>
          <button
            type="button"
            class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-40"
            :disabled="!canRemove"
            :aria-label="`Remove option ${index + 1}`"
            @click="removeOption(index)"
          >
            <AppIcon name="close" class="h-4 w-4" />
          </button>
        </li>
      </ul>

      <p v-if="errors.correct || server.options" class="type-error" role="alert">{{ errors.correct || server.options }}</p>
      <p v-if="errors.general" class="type-error" role="alert">{{ errors.general }}</p>

      <div>
        <AppButton variant="secondary" :disabled="!canAdd" @click="addOption">
          <AppIcon name="plus" class="h-4 w-4" />
          Add option
        </AppButton>
        <span v-if="!canAdd" class="type-help ml-3">A question can have at most {{ MAX_OPTIONS }} options.</span>
      </div>
    </fieldset>

    <div class="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
      <AppButton variant="ghost" @click="emit('cancel')">Cancel</AppButton>
      <AppButton type="submit" :loading="pending">{{ question ? 'Save question' : 'Add question' }}</AppButton>
    </div>
  </form>
</template>
