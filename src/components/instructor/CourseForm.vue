<script setup>
import { computed, reactive, ref } from 'vue'
import { ErrorKind, fieldErrors } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ImageField from '@/components/ui/ImageField.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// Create / edit form for a course. It builds the multipart body the backend expects and
// shows both client-side checks (same limits as the backend) and the backend's own
// field errors. `course` is only given when editing: then the stored category and
// thumbnail are shown, and the thumbnail is only sent when a new file was chosen.
// The course status is never part of this form (the backend owns it).
const props = defineProps({
  course: { type: Object, default: null },
  categories: { type: Array, required: true },
  pending: { type: Boolean, default: false },
  serverError: { type: Object, default: null },
  submitLabel: { type: String, default: 'Save course' },
})

const emit = defineEmits(['submit'])

const editing = computed(() => Boolean(props.course))

const form = reactive({
  name: props.course?.name ?? '',
  tagline: props.course?.tagline ?? '',
  description: props.course?.description ?? '',
  categoryId: props.course?.category?._id ?? '',
})
const thumbnail = ref(null)
const clientErrors = reactive({ name: '', tagline: '', description: '', categoryId: '', thumbnail: '' })

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
  clientErrors.thumbnail = editing.value || thumbnail.value ? '' : 'Choose a thumbnail image.'

  return Object.values(clientErrors).every((message) => !message)
}

const submit = () => {
  if (!validate()) return

  const body = new FormData()

  body.append('name', form.name.trim())
  body.append('tagline', form.tagline.trim())
  body.append('description', form.description.trim())
  body.append('categoryId', form.categoryId)
  if (thumbnail.value) body.append('thumbnail', thumbnail.value)

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
    <ImageField
      v-model="thumbnail"
      label="Thumbnail"
      :current-url="course?.thumbnail_url ?? ''"
      preview-alt="New thumbnail preview"
      :required="!editing"
      :hint="editing ? 'Leave empty to keep the current thumbnail. JPEG or PNG, up to 2 MB.' : 'JPEG or PNG, up to 2 MB.'"
      :error="error('thumbnail')"
    />

    <div>
      <AppButton type="submit" :loading="pending">{{ submitLabel }}</AppButton>
    </div>
  </form>
</template>
