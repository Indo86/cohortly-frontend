<script setup>
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { R } from '@/constants/routes.js'
import { ROLE_LABELS, Roles } from '@/constants/roles.js'
import { ErrorKind } from '@/services/apiError.js'
import { useAsyncAction } from '@/composables/useAsyncAction.js'
import { roleHome } from '@/router/guards.js'
import { useAuthStore } from '@/stores/auth.js'
import { safeInternalPath } from '@/utils/navigation.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// One sign-in form for both portals. A valid account always signs in (even when its
// workspace is inactive); where the user lands is decided by role and entitlement. An
// account used on the wrong portal is signed out again and told where to go, so a student
// is never silently placed in the instructor interface.
const props = defineProps({
  role: { type: String, required: true }, // Roles.INSTRUCTOR | Roles.STUDENT
})

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ email: '', password: '' })
const fieldErrors = reactive({ email: '', password: '' })
const wrongPortal = ref(false)

const { pending, error, run } = useAsyncAction(() => auth.signIn({ email: form.email.trim(), password: form.password }))

const isInstructorPortal = computed(() => props.role === Roles.INSTRUCTOR)
const otherPortal = computed(() => (isInstructorPortal.value ? R.STUDENT_SIGN_IN : R.INSTRUCTOR_SIGN_IN))
const otherLabel = computed(() => ROLE_LABELS[isInstructorPortal.value ? Roles.STUDENT : Roles.INSTRUCTOR])

const validate = () => {
  fieldErrors.email = /^\S+@\S+\.\S+$/.test(form.email.trim()) ? '' : 'Enter a valid email address.'
  fieldErrors.password = form.password ? '' : 'Enter your password.'

  return !fieldErrors.email && !fieldErrors.password
}

const message = computed(() => {
  if (!error.value) return ''

  // a 401 here is "wrong credentials", not an expired session
  if (error.value.kind === ErrorKind.AUTH) return 'Email or password is incorrect.'

  return error.value.message
})

const submit = async () => {
  wrongPortal.value = false

  if (!validate()) return

  const result = await run()

  if (!result.ok) return

  if (auth.role !== props.role) {
    auth.logout()
    wrongPortal.value = true

    return
  }

  await router.push(safeInternalPath(route.query.redirect) ?? { name: roleHome(auth) })
}
</script>

<template>
  <section class="auth-form">
    <p class="type-eyebrow mb-3">Welcome back</p>
    <h1 class="type-page-title">{{ ROLE_LABELS[role] }} sign in</h1>
    <p class="type-meta mt-1">
      {{ isInstructorPortal ? 'Manage your courses and students.' : 'Continue learning where you left off.' }}
    </p>

    <form class="mt-8 flex flex-col gap-6" novalidate @submit.prevent="submit">
      <InlineAlert v-if="message" tone="danger">{{ message }}</InlineAlert>
      <InlineAlert v-if="wrongPortal" tone="warning" title="Wrong sign-in page">
        This is a {{ otherLabel.toLowerCase() }} account, so you have been signed out of this page.
        <RouterLink :to="{ name: otherPortal }" class="font-semibold underline">Use the {{ otherLabel.toLowerCase() }} sign in</RouterLink>
      </InlineAlert>

      <AppInput v-model="form.email" label="Email" type="email" autocomplete="email" required :error="fieldErrors.email" />
      <AppInput
        v-model="form.password"
        label="Password"
        type="password"
        autocomplete="current-password"
        required
        :error="fieldErrors.password"
      />

      <AppButton type="submit" :loading="pending" block>Sign in</AppButton>
    </form>

    <p class="type-body mt-8 border-t border-line pt-6">
      <template v-if="isInstructorPortal">
        New here?
        <RouterLink :to="{ name: R.REGISTER }" class="type-link">Register your organization</RouterLink>
        <br>
      </template>
      <RouterLink :to="{ name: otherPortal }" class="type-link">{{ otherLabel }} sign in</RouterLink>
    </p>
  </section>
</template>
