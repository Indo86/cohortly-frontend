<script setup>
import { computed, ref, useId } from 'vue'

// Labelled input. The error and hint are tied to the field with aria-describedby and the
// field is flagged with aria-invalid (which also drives the red border), so screen readers
// announce them. Label, hint and error use the shared type scale.
const props = defineProps({
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  autocomplete: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const model = defineModel({ type: String, default: '' })

const inputRef = ref(null)

// lets a parent move keyboard focus into the field (e.g. when an inline form opens)
defineExpose({ focus: () => inputRef.value?.focus() })

const id = useId()
const errorId = `${id}-error`
const hintId = `${id}-hint`

const describedBy = computed(() => {
  const ids = []

  if (props.hint) ids.push(hintId)
  if (props.error) ids.push(errorId)

  return ids.join(' ') || undefined
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="type-label">
      {{ label }}
      <span v-if="required" class="ml-1 text-metadata font-normal text-ink-3">(required)</span>
    </label>
    <input
      :id="id"
      ref="inputRef"
      v-model="model"
      :type="type"
      :autocomplete="autocomplete"
      :required="required"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="field-control"
    >
    <p v-if="hint" :id="hintId" class="type-help">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="type-error">{{ error }}</p>
  </div>
</template>
