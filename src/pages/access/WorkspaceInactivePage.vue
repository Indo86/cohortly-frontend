<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useAsyncAction } from '@/composables/useAsyncAction.js'
import { roleHome } from '@/router/guards.js'
import { useAuthStore } from '@/stores/auth.js'
import { formatDateTime } from '@/utils/date.js'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import PageHeader from '@/components/ui/PageHeader.vue'

// A student's dedicated "your organization's workspace is not active" state. The student
// stays signed in, cannot fix it, and has no payment controls anywhere: the instructor
// who owns the workspace is the one who renews.
const auth = useAuthStore()
const router = useRouter()
const stillInactive = ref(false)

const { pending, error, run } = useAsyncAction(async () => {
  await auth.fetchMe()

  if (auth.isActive) await router.replace({ name: roleHome(auth) })
  else stillInactive.value = true
})

const checkAgain = () => {
  stillInactive.value = false
  run()
}
</script>

<template>
  <div>
    <PageHeader title="Learning is paused" description="Your courses are temporarily unavailable." />

    <AppCard class="max-w-2xl">
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="type-section-title">Your organization’s workspace</h2>
        <StatusBadge kind="workspace" :status="auth.accessStatus" />
      </div>

      <p class="type-body mt-3">
        Your organization’s learning access is currently inactive, so your course content is temporarily unavailable.
        You are still signed in, and your progress is kept.
      </p>
      <p class="type-body mt-2">
        Only your instructor or organization can restore access, so please contact them.
      </p>
      <p class="type-body mt-2">
        Certificates you have already earned stay available:
        <RouterLink :to="{ name: R.STUDENT_CERTIFICATES }" class="type-link">view your certificates</RouterLink>.
      </p>
      <p v-if="auth.accessExpiresAt" class="type-meta mt-2">
        Last active period ended {{ formatDateTime(auth.accessExpiresAt) }}.
      </p>

      <InlineAlert v-if="error" tone="danger" class="mt-4">{{ error.message }}</InlineAlert>
      <InlineAlert v-else-if="stillInactive" tone="info" class="mt-4">The workspace is still not active.</InlineAlert>

      <div class="mt-6 border-t border-line pt-5">
        <AppButton variant="secondary" :loading="pending" @click="checkAgain">Check again</AppButton>
      </div>
    </AppCard>
  </div>
</template>
