<script setup>
import { computed, ref } from 'vue'
import { ACCESS_LABELS, Access } from '@/constants/access.js'
import { createCheckout } from '@/services/paymentService.js'
import { useAsyncAction } from '@/composables/useAsyncAction.js'
import { useAuthStore } from '@/stores/auth.js'
import { formatDateTime } from '@/utils/date.js'
import { isSafeExternalUrl, redirectExternal } from '@/utils/navigation.js'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import PageHeader from '@/components/ui/PageHeader.vue'

// Plan & Billing (instructor only, reachable in every access state, so an expired or unpaid
// instructor can always recover). The state shown is the backend's, never guessed here, and
// payment success is never assumed locally: the user pays on the hosted Midtrans page and
// the backend activates the workspace when Midtrans confirms.
const auth = useAuthStore()

const redirectingTo = ref('')
const refreshNotice = ref('')

const COPY = {
  [Access.NONE]: {
    summary: 'Your workspace has not been activated yet.',
    action: 'Pay to activate',
  },
  [Access.PENDING]: {
    summary: 'A payment was started but has not been confirmed yet. You can continue it or check again shortly.',
    action: 'Continue payment',
  },
  [Access.FAILED]: {
    summary: 'The last payment did not go through, so the workspace is not active.',
    action: 'Try payment again',
  },
  [Access.EXPIRED]: {
    summary: 'Your subscription period has ended. Courses, students and your students’ learning are paused until you renew.',
    action: 'Renew subscription',
  },
  [Access.ACTIVE]: {
    summary: 'Your workspace is active. You can renew early; the new period is added after the current one.',
    action: 'Renew early',
  },
}

const copy = computed(() => COPY[auth.accessStatus] ?? COPY[Access.NONE])
const expiry = computed(() => formatDateTime(auth.accessExpiresAt))
const start = computed(() => formatDateTime(auth.accessStartsAt))

const checkout = useAsyncAction(async () => {
  const data = await createCheckout()

  if (!isSafeExternalUrl(data?.midtrans_payment_url)) throw new Error('The payment page could not be opened.')

  // keep the displayed state in line with what the backend just reported
  auth.applyEntitlement({ accessStatus: data.accessStatus, accessExpiresAt: data.accessExpiresAt })
  redirectingTo.value = data.purpose === 'renewal' ? 'renewal' : 'activation'
  redirectExternal(data.midtrans_payment_url)
})

const refresh = useAsyncAction(async () => {
  await auth.fetchMe()
  refreshNotice.value = `Status checked: ${ACCESS_LABELS[auth.accessStatus]}.`
})

const startPayment = () => {
  refreshNotice.value = ''
  checkout.run()
}

const checkAgain = () => {
  refreshNotice.value = ''
  refresh.run()
}
</script>

<template>
  <div>
    <PageHeader title="Plan & Billing" description="Your subscription keeps your courses and your students’ learning available." />

    <div class="grid max-w-4xl gap-6">
      <AppCard>
        <p class="type-eyebrow mb-3">Workspace account</p>
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="type-section-title">Subscription</h2>
          <StatusBadge kind="subscription" :status="auth.accessStatus" />
        </div>

        <p class="type-body mt-3">{{ copy.summary }}</p>

        <dl v-if="start || expiry" class="mt-8 grid gap-6 border-y border-line py-6 sm:grid-cols-2">
          <div v-if="start">
            <dt class="text-sm text-ink-2">Current period started</dt>
            <dd class="mt-2 font-display text-xl text-ink">{{ start }}</dd>
          </div>
          <div v-if="expiry">
            <dt class="text-sm text-ink-2">
              {{ auth.isActive ? 'Active until' : 'Ended on' }}
            </dt>
            <dd class="mt-2 font-display text-xl text-ink">{{ expiry }}</dd>
          </div>
        </dl>

        <div class="mt-5 flex flex-col gap-3 empty:hidden">
          <InlineAlert v-if="checkout.error.value" tone="danger" title="Could not start the payment">
            {{ checkout.error.value.status === 502 || checkout.error.value.status === 503
              ? 'The payment provider is not available right now. Nothing was charged; please try again in a moment.'
              : checkout.error.value.message }}
          </InlineAlert>
          <InlineAlert v-else-if="redirectingTo" tone="success">
            Opening the secure payment page for your {{ redirectingTo }}…
          </InlineAlert>
          <InlineAlert v-if="refresh.error.value" tone="danger">{{ refresh.error.value.message }}</InlineAlert>
          <InlineAlert v-else-if="refreshNotice" tone="info">{{ refreshNotice }}</InlineAlert>
        </div>

        <div class="mt-6 flex flex-col gap-3 sm:flex-row">
          <AppButton :loading="checkout.pending.value" @click="startPayment">{{ copy.action }}</AppButton>
          <AppButton variant="secondary" :loading="refresh.pending.value" @click="checkAgain">Check status</AppButton>
        </div>

        <p class="type-help mt-5 border-t border-line pt-4">
          Payments are handled on a secure Midtrans page. After paying, it can take a moment for the status to update; use
          “Check status” to refresh it.
        </p>
      </AppCard>
    </div>
  </div>
</template>
