<script setup>
import { computed, useId } from 'vue'

// Labelled <select>. `options` are { value, label }. Error/hint are tied with aria-describedby.
const props = defineProps({
  label: { type: String, required: true },
  options: { type: Array, required: true },
  placeholder: { type: String, default: 'Choose…' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const model = defineModel({ type: String, default: '' })

const id = useId()
const describedBy = computed(() => [props.hint && `${id}-hint`, props.error && `${id}-error`].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="type-label">
      {{ label }}
      <span v-if="required" class="ml-1 text-metadata font-normal text-ink-3">(required)</span>
    </label>
    <select
      :id="id"
      v-model="model"
      :required="required"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="field-control"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <p v-if="hint" :id="`${id}-hint`" class="type-help">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="type-error">{{ error }}</p>
  </div>
</template>
