<script setup>
import { computed, reactive } from 'vue'
import { ErrorKind, fieldErrors } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// Create / edit form for a course. It builds the multipart body the backend expects and
// shows both client-side checks (same limits as the backend) and the backend's own
// field errors. `course` is only given when editing (its stored values are pre-filled). There is no
// image upload: the cover is generated from the course (see CourseCover).
// The course status is never part of this form (the backend owns it).
const props = defineProps({
  course: { type: Object, default: null },
  categories: { type: Array, required: true },
  pending: { type: Boolean, default: false },
  serverError: { type: Object, default: null },
  submitLabel: { type: String, default: 'Save course' },
})

const emit = defineEmits(['submit'])

const form = reactive({
  name: props.course?.name ?? '',
  tagline: props.course?.tagline ?? '',
  description: props.course?.description ?? '',
  categoryId: props.course?.category?._id ?? '',
})
const clientErrors = reactive({ name: '', tagline: '', description: '', categoryId: '' })

const categoryOptions = computed(() => props.categories.map((c) => ({ value: c._id, label: c.name })))
const serverFields = computed(() => fieldErrors(props.serverError))
const error = (field) => clientErrors[field] || serverFields.value[field] || ''

const generalMessage = computed(() => {
  if (!props.serverError) return ''
  // field problems are shown next to their fields
  if (props.serverError.kind === ErrorKind.VALIDATION && Object.keys(serverFields.value).length) return ''

  return props.serverError.message
})

const validate = () => {
  clientErrors.name = form.name.trim().length >= 5 ? '' : 'Enter a name of at least 5 characters.'
  clientErrors.tagline = form.tagline.trim().length >= 5 ? '' : 'Enter a tagline of at least 5 characters.'
  clientErrors.description =
    form.description.trim().length >= 10 ? '' : 'Enter a description of at least 10 characters.'
  clientErrors.categoryId = form.categoryId ? '' : 'Choose a category.'

  return Object.values(clientErrors).every((message) => !message)
}

const submit = () => {
  if (!validate()) return

  const body = new FormData()

  body.append('name', form.name.trim())
  body.append('tagline', form.tagline.trim())
  body.append('description', form.description.trim())
  body.append('categoryId', form.categoryId)

  emit('submit', body)
}
</script>

<template>
  <form class="flex max-w-2xl flex-col gap-4" novalidate @submit.prevent="submit">
    <InlineAlert v-if="generalMessage" tone="danger">{{ generalMessage }}</InlineAlert>

    <AppInput v-model="form.name" label="Course name" required :error="error('name')" />
    <AppInput v-model="form.tagline" label="Tagline" required hint="One short line that sells the course." :error="error('tagline')" />
    <AppSelect v-model="form.categoryId" label="Category" :options="categoryOptions" required :error="error('categoryId')" />
    <AppTextarea v-model="form.description" label="Description" :rows="5" required :error="error('description')" />
    <p class="type-help">The course cover is created for you from the course, so there is nothing to upload.</p>

    <div>
      <AppButton type="submit" :loading="pending">{{ submitLabel }}</AppButton>
    </div>
  </form>
</template>
