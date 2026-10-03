<script setup>
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

// Image upload with a preview. v-model is the chosen File (or null). `currentUrl` is the
// image that is stored today (shown until a new file is picked). The backend accepts
// JPEG/PNG up to 2 MB; the check here only saves a round trip, the backend decides.
const props = defineProps({
  label: { type: String, required: true },
  currentUrl: { type: String, default: '' },
  previewAlt: { type: String, default: 'Selected image preview' },
  error: { type: String, default: '' },
  hint: { type: String, default: 'JPEG or PNG, up to 2 MB.' },
  required: { type: Boolean, default: false },
})

const MAX_BYTES = 2 * 1024 * 1024

const model = defineModel({ type: Object, default: null }) // a File
const localError = ref('')
const previewUrl = ref('')

const id = useId()
const shownError = computed(() => localError.value || props.error)
const describedBy = computed(() => [`${id}-hint`, shownError.value && `${id}-error`].filter(Boolean).join(' '))
const shown = computed(() => previewUrl.value || props.currentUrl)

const onChange = (event) => {
  const file = event.target.files?.[0] ?? null

  localError.value = ''

  if (file && !['image/jpeg', 'image/png'].includes(file.type)) {
    localError.value = 'Choose a JPEG or PNG image.'
    event.target.value = ''
    model.value = null

    return
  }

  if (file && file.size > MAX_BYTES) {
    localError.value = 'The image must be 2 MB or smaller.'
    event.target.value = ''
    model.value = null

    return
  }

  model.value = file
}

watch(model, (file) => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)

  previewUrl.value = file ? URL.createObjectURL(file) : ''
})

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="type-label">
      {{ label }}
      <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>
    <div
      class="flex flex-col gap-3 rounded-card border border-dashed bg-surface-muted p-3 sm:flex-row sm:items-center"
      :class="shownError ? 'border-danger' : 'border-line-control'"
    >
      <img v-if="shown" :src="shown" :alt="previewUrl ? previewAlt : 'Current image'" class="h-24 w-full shrink-0 rounded-control border border-line bg-surface object-cover sm:w-36">
      <div v-else class="flex h-24 w-full shrink-0 items-center justify-center rounded-control border border-line bg-surface text-xs text-ink-muted sm:w-36">
        No image yet
      </div>
      <input
        :id="id"
        type="file"
        accept="image/png,image/jpeg"
        :aria-invalid="shownError ? 'true' : undefined"
        :aria-describedby="describedBy"
        class="block min-w-0 flex-1 text-sm text-ink-soft file:mr-3 file:min-h-[2.5rem] file:cursor-pointer file:rounded-control file:border file:border-line-control file:bg-surface file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-surface-muted"
        @change="onChange"
      >
    </div>
    <p :id="`${id}-hint`" class="type-help">{{ hint }}</p>
    <p v-if="shownError" :id="`${id}-error`" class="type-error">{{ shownError }}</p>
  </div>
</template>
