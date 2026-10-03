<script setup>
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import { ErrorKind, fieldErrors as toFieldErrors } from '@/services/apiError.js'
import * as authService from '@/services/authService.js'
import { useAsyncAction } from '@/composables/useAsyncAction.js'
import { isSafeExternalUrl, redirectExternal } from '@/utils/navigation.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// Instructor registration. The backend creates the account and a pending payment, and
// answers with the hosted Midtrans page; this page only sends the user there. No card
// data is ever handled here. If the payment provider fails the backend rolls the
// registration back, so submitting again is always safe.
const form = reactive({ name: '', email: '', password: '' })
const clientErrors = reactive({ name: '', email: '', password: '' })
const serverFieldErrors = ref({})
const paymentUrl = ref('')

const { pending, error, run } = useAsyncAction(() =>
  authService.signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password })
)

const errors = computed(() => ({
  name: clientErrors.name || serverFieldErrors.value.name || '',
  email: clientErrors.email || serverFieldErrors.value.email || '',
  password: clientErrors.password || serverFieldErrors.value.password || '',
}))

const validate = () => {
  clientErrors.name = form.name.trim().length >= 5 ? '' : 'Enter your full name (at least 5 characters).'
  clientErrors.email = /^\S+@\S+\.\S+$/.test(form.email.trim()) ? '' : 'Enter a valid email address.'
  clientErrors.password =
    form.password.length >= 5 && form.password.length <= 72 ? '' : 'Use a password of 5 to 72 characters.'

  return !clientErrors.name && !clientErrors.email && !clientErrors.password
}

const emailTaken = computed(() => error.value?.code === 'EMAIL_EXISTS')

const problem = computed(() => {
  if (!error.value || emailTaken.value) return ''
  if (error.value.kind === ErrorKind.VALIDATION && Object.keys(serverFieldErrors.value).length) {
    return 'Please fix the highlighted fields.'
  }
  if (error.value.status === 502 || error.value.status === 503) {
    return 'The payment provider is not available right now. Nothing was saved, so you can try again in a moment.'
  }

  return error.value.message
})

const submit = async () => {
  serverFieldErrors.value = {}
  paymentUrl.value = ''

  if (!validate()) return

  const result = await run()

  if (!result.ok) {
    serverFieldErrors.value = toFieldErrors(result.error)

    return
  }

  const url = result.data?.midtrans_payment_url

  if (!isSafeExternalUrl(url)) {
    error.value = { message: 'The payment page could not be opened. Please try again.' }

    return
  }

  paymentUrl.value = url
  redirectExternal(url)
}
</script>

<template>
  <AppCard>
    <h1 class="type-page-title">Register your organization</h1>
    <p class="type-meta mt-1">
      Create an instructor account. You will complete the subscription payment on a secure hosted page.
    </p>

    <InlineAlert v-if="paymentUrl" tone="success" title="Taking you to the secure payment page" class="mt-6">
      If nothing happens,
      <a :href="paymentUrl" class="font-semibold underline">open the payment page</a>.
      Afterwards, sign in to see your subscription.
    </InlineAlert>

    <form v-else class="mt-6 flex flex-col gap-4" novalidate @submit.prevent="submit">
      <InlineAlert v-if="emailTaken" tone="warning" title="This email is already registered">
        <RouterLink :to="{ name: R.INSTRUCTOR_SIGN_IN }" class="font-semibold underline">Sign in</RouterLink>
        to renew or complete your payment instead.
      </InlineAlert>
      <InlineAlert v-else-if="problem" tone="danger">{{ problem }}</InlineAlert>

      <AppInput v-model="form.name" label="Full name" autocomplete="name" required :error="errors.name" />
      <AppInput v-model="form.email" label="Email" type="email" autocomplete="email" required :error="errors.email" />
      <AppInput
        v-model="form.password"
        label="Password"
        type="password"
        autocomplete="new-password"
        required
        hint="5 to 72 characters."
        :error="errors.password"
      />

      <AppButton type="submit" :loading="pending" block>Continue to payment</AppButton>
    </form>

    <p class="type-meta mt-6 text-center">
      Already registered?
      <RouterLink :to="{ name: R.INSTRUCTOR_SIGN_IN }" class="type-link">Sign in</RouterLink>
    </p>
  </AppCard>
</template>
