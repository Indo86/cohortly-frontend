<script setup>
import { onMounted } from 'vue'
import { R } from '@/constants/routes.js'
import { ACCESS_LABELS, ACCESS_TONES } from '@/constants/access.js'
import { useAsyncAction } from '@/composables/useAsyncAction.js'
import { roleHome } from '@/router/guards.js'
import { useAuthStore } from '@/stores/auth.js'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// Where Midtrans returns the browser after the hosted payment. The page cannot know the
// payment result: Midtrans confirms it to the backend separately. So it never claims
// success; it only reloads the real access state if there is a session.
const auth = useAuthStore()
const { pending, error, run } = useAsyncAction(() => auth.fetchMe())

onMounted(() => {
  // only instructors have a payment to check; students just get a way back
  if (auth.isInstructor) run()
})
</script>

<template>
  <AppCard>
    <h1 class="type-page-title">Thanks, we’re confirming your payment</h1>
    <p class="type-meta mt-2">
      Payments are confirmed by our payment provider, which can take a moment. Your workspace becomes active as soon as it is
      confirmed.
    </p>

    <div v-if="auth.isStudent" class="mt-6 flex flex-col gap-3">
      <AppButton :to="{ name: roleHome(auth) }">Back to your learning area</AppButton>
    </div>
    <template v-else-if="auth.isAuthenticated">
      <div class="mt-4 flex items-center gap-2 text-sm">
        Current status:
        <AppBadge :tone="ACCESS_TONES[auth.accessStatus]">{{ ACCESS_LABELS[auth.accessStatus] }}</AppBadge>
      </div>
      <InlineAlert v-if="error" tone="danger" class="mt-4">{{ error.message }}</InlineAlert>
      <div class="mt-6 flex flex-col gap-3">
        <AppButton :loading="pending" @click="run()">Check status again</AppButton>
        <AppButton :to="{ name: roleHome(auth) }" variant="secondary">
          {{ auth.isActive ? 'Go to dashboard' : 'Go to Plan & Billing' }}
        </AppButton>
      </div>
    </template>
    <div v-else class="mt-6 flex flex-col gap-3">
      <AppButton :to="{ name: R.INSTRUCTOR_SIGN_IN }">Sign in to see your subscription</AppButton>
    </div>
  </AppCard>
</template>
