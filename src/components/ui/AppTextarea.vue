<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  rows: { type: Number, default: 4 },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  required: { type: Boolean, default: false },
})

const model = defineModel({ type: String, default: '' })

const id = useId()
const describedBy = computed(() => [props.hint && `${id}-hint`, props.error && `${id}-error`].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="type-label">
      {{ label }}
      <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>
    <textarea
      :id="id"
      v-model="model"
      :rows="rows"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="field-control"
    />
    <p v-if="hint" :id="`${id}-hint`" class="type-help">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="type-error">{{ error }}</p>
  </div>
</template>
