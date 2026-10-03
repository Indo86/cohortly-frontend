<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { R } from '@/constants/routes.js'
import { instructorNav } from '@/constants/navigation.js'
import { useAuthStore } from '@/stores/auth.js'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import AppShell from './AppShell.vue'

const auth = useAuthStore()
const route = useRoute()
</script>

<template>
  <AppShell
    :items="instructorNav"
    :home-to="{ name: auth.isActive ? R.INSTRUCTOR_DASHBOARD : R.INSTRUCTOR_BILLING }"
    area-label="Instructor workspace"
  >
    <InlineAlert
      v-if="auth.needsPayment && route.name !== R.INSTRUCTOR_BILLING"
      tone="warning"
      title="Your workspace is not active"
      class="mb-6"
    >
      Course management is unavailable until the subscription is active.
      <RouterLink :to="{ name: R.INSTRUCTOR_BILLING }" class="type-link">Go to Plan &amp; Billing</RouterLink>
    </InlineAlert>
    <RouterView />
  </AppShell>
</template>
