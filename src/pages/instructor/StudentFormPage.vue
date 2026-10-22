<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useStudentQuery } from '@/composables/instructorQueries.js'
import { useCreateStudent, useUpdateStudent } from '@/composables/instructorMutations.js'
import { useRouteParam } from '@/composables/useRouteParam.js'
import { ErrorKind, fieldErrors } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import ImageField from '@/components/ui/ImageField.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import DataState from '@/components/feedback/DataState.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// Create and edit a student (same form). When editing, an empty password field means "keep the
// current password": it is simply not sent (see studentService.studentForm), which finally
// retires the old "undefined" workaround. The avatar is required on create and optional on edit.
const router = useRouter()
const studentId = useRouteParam('studentId')
const editing = computed(() => Boolean(studentId.value))

const student = useStudentQuery(studentId)
const create = useCreateStudent()
const update = useUpdateStudent(studentId)
const mutation = computed(() => (editing.value ? update : create))

const form = reactive({ name: '', email: '', password: '' })
const avatar = ref(null)
const clientErrors = reactive({ name: '', email: '', password: '', avatar: '' })
const hydrated = ref(false)

watch(
  () => student.data.value,
  (stored) => {
    if (!stored || hydrated.value) return

    form.name = stored.name
    form.email = stored.email
    hydrated.value = true
  },
  { immediate: true }
)

const currentPhoto = computed(() => student.data.value?.photo_url ?? '')

const serverFields = computed(() => fieldErrors(mutation.value.error.value))
const duplicateEmail = computed(() => mutation.value.error.value?.code === 'EMAIL_EXISTS')

const error = (field) =>
  clientErrors[field] ||
  serverFields.value[field] ||
  (field === 'email' && duplicateEmail.value ? 'A user with this email already exists.' : '')

const generalMessage = computed(() => {
  const failure = mutation.value.error.value

  if (!failure || duplicateEmail.value) return ''
  if (failure.kind === ErrorKind.VALIDATION && Object.keys(serverFields.value).length) return ''

  return failure.message
})

const validate = () => {
  const typedPassword = form.password.length > 0

  clientErrors.name = form.name.trim().length >= 5 ? '' : 'Enter a name of at least 5 characters.'
  clientErrors.email = /^\S+@\S+\.\S+$/.test(form.email.trim()) ? '' : 'Enter a valid email address.'
  clientErrors.password =
    (!editing.value || typedPassword) && (form.password.length < 8 || form.password.length > 72)
      ? 'Use a password of 8 to 72 characters.'
      : ''
  clientErrors.avatar = editing.value || avatar.value ? '' : 'Choose an avatar image.'

  return Object.values(clientErrors).every((message) => !message)
}

const submit = async () => {
  if (!validate()) return

  const values = {
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password, // empty = not sent
    avatar: avatar.value,
  }

  try {
    if (editing.value) await update.mutateAsync(values)
    else await create.mutateAsync(values)

    await router.push({ name: R.INSTRUCTOR_STUDENTS })
  } catch {
    // shown by the form
  }
}
</script>

<template>
  <div>
    <PageHeader :title="editing ? 'Edit student' : 'Add student'" :description="editing ? 'Update the student’s details.' : 'Create an account for a student you will enroll in your courses.'">
      <template #back>
        <RouterLink :to="{ name: R.INSTRUCTOR_STUDENTS }" class="back-link">← Back to students</RouterLink>
      </template>
    </PageHeader>

    <AppCard class="max-w-form">
      <DataState
        :pending="editing && student.isPending.value"
        :error="editing ? student.error.value : null"
        subject="the student"
        loading-label="Loading the student…"
        @retry="student.refetch()"
      >
        <form v-if="!editing || hydrated" class="flex flex-col gap-5" novalidate @submit.prevent="submit">
          <InlineAlert v-if="generalMessage" tone="danger">{{ generalMessage }}</InlineAlert>

          <AppInput v-model="form.name" label="Full name" autocomplete="off" required :error="error('name')" />
          <AppInput v-model="form.email" label="Email" type="email" autocomplete="off" required :error="error('email')" />
          <AppInput
            v-model="form.password"
            :label="editing ? 'New password' : 'Password'"
            type="password"
            autocomplete="new-password"
            :required="!editing"
            :hint="editing ? 'Leave empty to keep the current password.' : '8 to 72 characters. Share it with the student.'"
            :error="error('password')"
          />
          <ImageField
            v-model="avatar"
            label="Avatar"
            :current-url="editing ? currentPhoto : ''"
            preview-alt="New avatar preview"
            :required="!editing"
            :hint="editing ? 'Leave empty to keep the current avatar. JPEG or PNG, up to 2 MB.' : 'JPEG or PNG, up to 2 MB.'"
            :error="error('avatar')"
          />

          <div class="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <AppButton variant="ghost" :to="{ name: R.INSTRUCTOR_STUDENTS }">Cancel</AppButton>
            <AppButton type="submit" :loading="mutation.isPending.value">{{ editing ? 'Save changes' : 'Add student' }}</AppButton>
          </div>
        </form>
      </DataState>
    </AppCard>
  </div>
</template>
