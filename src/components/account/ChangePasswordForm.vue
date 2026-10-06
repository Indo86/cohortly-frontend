<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAsyncAction } from '@/composables/useAsyncAction.js'
import { signInRouteFor } from '@/router/guards.js'
import { ErrorKind, fieldErrors } from '@/services/apiError.js'
import * as authService from '@/services/authService.js'
import { useAuthStore } from '@/stores/auth.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'

// The signed-in user's own password (PUT /api/me/password). The local checks only help the user; the
// backend decides (current password, policy). A successful change signs out every session, this one
// included, so the app forgets the session (token, store, cached data) and asks to sign in again.
const MIN_LENGTH = 8
const MAX_LENGTH = 72

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const clientErrors = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

const { pending, error, run } = useAsyncAction(() =>
  authService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
)

const serverFields = computed(() => fieldErrors(error.value))
const fieldError = (name) => clientErrors[name] || serverFields.value[name] || ''
const generalMessage = computed(() => {
  if (!error.value) return ''
  if (error.value.kind === ErrorKind.VALIDATION && Object.keys(serverFields.value).length) return ''

  return error.value.message
})

const validate = () => {
  const { currentPassword, newPassword, confirmPassword } = form

  clientErrors.currentPassword = currentPassword ? '' : 'Enter your current password.'
  clientErrors.newPassword =
    newPassword.length < MIN_LENGTH || newPassword.length > MAX_LENGTH
      ? `Use a password of ${MIN_LENGTH} to ${MAX_LENGTH} characters.`
      : newPassword === currentPassword
        ? 'Choose a new password that is different from the current one.'
        : ''
  clientErrors.confirmPassword = confirmPassword === newPassword ? '' : 'The passwords do not match.'

  return Object.values(clientErrors).every((message) => !message)
}

const submit = async () => {
  if (!validate()) return

  const result = await run()

  if (!result.ok) return

  // the server has invalidated every token: forget this session (token, identity, cached data)
  const target = signInRouteFor(auth.role)

  auth.logout()
  await router.replace({ name: target, query: { passwordChanged: '1' } })
}
</script>

<template>
  <section class="max-w-form border-t border-line py-8" aria-labelledby="change-password-heading">
    <SectionHeader id="change-password-heading" title="Change password" description="You will be signed out everywhere and asked to sign in with the new password." />

    <form class="flex flex-col gap-5" novalidate @submit.prevent="submit">
      <InlineAlert v-if="generalMessage" tone="danger">{{ generalMessage }}</InlineAlert>

      <AppInput
        v-model="form.currentPassword"
        label="Current password"
        type="password"
        autocomplete="current-password"
        required
        :error="fieldError('currentPassword')"
      />
      <AppInput
        v-model="form.newPassword"
        label="New password"
        type="password"
        autocomplete="new-password"
        required
        :hint="`${MIN_LENGTH} to ${MAX_LENGTH} characters.`"
        :error="fieldError('newPassword')"
      />
      <AppInput
        v-model="form.confirmPassword"
        label="Confirm new password"
        type="password"
        autocomplete="new-password"
        required
        :error="fieldError('confirmPassword')"
      />

      <div class="flex justify-end border-t border-line pt-5">
        <AppButton type="submit" :loading="pending">Change password</AppButton>
      </div>
    </form>
  </section>
</template>
