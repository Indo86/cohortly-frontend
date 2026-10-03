<script setup>
import { computed, reactive, useId } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'

// AI-generated PRACTICE questions: for self-study only. The student answers locally, checks each answer to see
// the explanation, and may see a practice score. Nothing here is sent anywhere: it is not an attempt of the final
// quiz, does not change lesson progress, course completion or certificates, and is not visible to the instructor.
const props = defineProps({
  questions: { type: Array, required: true }, // [{ question, options, answer (index), explanation }]
  pending: { type: Boolean, default: false },
})

const emit = defineEmits(['regenerate'])

const uid = useId()
const chosen = reactive({}) // index -> chosen option index
const checked = reactive({}) // index -> true once checked

const checkedCount = computed(() => props.questions.filter((_, index) => checked[index]).length)
const correctCount = computed(() => props.questions.filter((question, index) => checked[index] && chosen[index] === question.answer).length)
const allChecked = computed(() => props.questions.length > 0 && checkedCount.value === props.questions.length)
</script>

<template>
  <section class="mt-6" :aria-labelledby="`${uid}-heading`" data-testid="practice-questions">
    <div class="flex flex-wrap items-center gap-2">
      <h3 :id="`${uid}-heading`" class="type-card-title">Practice questions</h3>
      <AppBadge>AI-generated</AppBadge>
    </div>
    <p class="type-help mt-1">For practice only. They are not your course quiz and do not affect your progress. Review before relying on them.</p>

    <ol class="mt-4 flex flex-col gap-4">
      <li v-for="(question, index) in questions" :key="index" class="rounded-control border border-line p-4">
        <fieldset :disabled="checked[index]">
          <legend class="type-label float-left mb-3 w-full break-words">{{ index + 1 }}. {{ question.question }}</legend>
          <div class="clear-both flex flex-col gap-2">
            <label
              v-for="(option, optionIndex) in question.options"
              :key="optionIndex"
              class="flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-control border px-3 py-2 text-sm text-ink"
              :class="chosen[index] === optionIndex ? 'border-primary bg-primary-faint' : 'border-line-control'"
            >
              <input v-model="chosen[index]" type="radio" :name="`${uid}-q${index}`" :value="optionIndex" class="h-5 w-5 shrink-0 accent-primary">
              <span class="min-w-0 break-words">{{ option }}</span>
            </label>
          </div>
        </fieldset>

        <div class="mt-3">
          <AppButton v-if="!checked[index]" variant="secondary" :disabled="chosen[index] === undefined" :aria-label="`Check answer to question ${index + 1}`" @click="checked[index] = true">
            Check answer
          </AppButton>

          <div v-else class="text-sm" role="status">
            <p class="font-semibold text-ink">
              <template v-if="chosen[index] === question.answer">Correct.</template>
              <template v-else>Not quite. The answer is: {{ question.options[question.answer] }}</template>
            </p>
            <p class="type-body mt-1">{{ question.explanation }}</p>
          </div>
        </div>
      </li>
    </ol>

    <p v-if="allChecked" class="mt-4 text-sm font-semibold text-ink" role="status" data-testid="practice-score">
      Practice score: {{ correctCount }} of {{ questions.length }}
      <span class="type-help block font-normal">This is only for practice. It is separate from your course quiz and is not saved.</span>
    </p>

    <div class="mt-4">
      <AppButton variant="ghost" :loading="pending" @click="emit('regenerate')">Generate new questions</AppButton>
    </div>
  </section>
</template>
