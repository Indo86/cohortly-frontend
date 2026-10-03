<script setup>
import { useRoute, useRouter } from 'vue-router'
import { R } from '@/constants/routes.js'
import { roleHome } from '@/router/guards.js'
import { useAuthStore } from '@/stores/auth.js'
import { safeInternalPath } from '@/utils/navigation.js'
import { useAsyncAction } from '@/composables/useAsyncAction.js'
import ErrorState from '@/components/feedback/ErrorState.vue'

// Shown when a saved session exists but the backend could not be reached to confirm it.
// The token is kept (a flaky network must not sign anyone out); retry asks again.
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const { pending, run } = useAsyncAction(async () => {
  await auth.retryInitialize()

  if (auth.sessionState === 'unavailable') return

  await router.replace(safeInternalPath(route.query.redirect) ?? { name: auth.isAuthenticated ? roleHome(auth) : R.HOME })
})
</script>

<template>
  <ErrorState
    :level="1"
    title="Cannot reach the server"
    message="We could not check your session. Your sign-in is kept; check your connection and try again."
    :retry-label="pending ? 'Trying…' : 'Try again'"
    @retry="run()"
  />
</template>
