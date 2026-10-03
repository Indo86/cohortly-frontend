<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useCertificateVerificationQuery } from '@/composables/studentQueries.js'
import { ErrorKind } from '@/services/apiError.js'
import { formatDate } from '@/utils/date.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'

// PUBLIC certificate verification: no sign-in. It shows only what the backend returns for a valid
// number (the fields printed on the certificate): holder name, course, instructor, date and number.
// An unknown number is a calm "not found", never a hint about why.
const props = defineProps({
  certificateNumber: { type: String, required: true },
})

const query = useCertificateVerificationQuery(computed(() => props.certificateNumber))
const certificate = computed(() => query.data.value ?? null)
const notFound = computed(() => query.error.value?.kind === ErrorKind.NOT_FOUND)
</script>

<template>
  <div>
    <LoadingState v-if="query.isPending.value" label="Checking the certificate…" />

    <AppCard v-else-if="certificate" aria-labelledby="valid-heading" data-testid="verification-valid">
      <div class="flex items-center gap-3">
        <AppIcon name="check-circle" class="h-8 w-8 text-success" />
        <h1 id="valid-heading" class="type-page-title">Valid certificate</h1>
      </div>
      <p class="type-body mt-3">This certificate was issued through Cohortly.</p>

      <dl class="mt-5 flex flex-col gap-4 rounded-control bg-surface-muted p-4">
        <div>
          <dt class="type-eyebrow">Awarded to</dt>
          <dd class="mt-1 text-base font-semibold text-ink">{{ certificate.studentName }}</dd>
        </div>
        <div>
          <dt class="type-eyebrow">Course</dt>
          <dd class="mt-1 text-base text-ink">{{ certificate.courseName }}</dd>
        </div>
        <div>
          <dt class="type-eyebrow">Instructor</dt>
          <dd class="mt-1 text-base text-ink">{{ certificate.instructorName }}</dd>
        </div>
        <div>
          <dt class="type-eyebrow">Issued</dt>
          <dd class="mt-1 text-base text-ink">{{ formatDate(certificate.issuedAt) }}</dd>
        </div>
        <div>
          <dt class="type-eyebrow">Certificate ID</dt>
          <dd class="mt-1 font-mono text-base tracking-wide text-ink">{{ certificate.certificateNumber }}</dd>
        </div>
      </dl>

      <p class="type-help mt-4">Only the details printed on the certificate are shown here.</p>
      <p class="type-meta mt-4 text-center">
        <RouterLink :to="{ name: R.CERTIFICATE_LOOKUP }" class="type-link">Verify another certificate</RouterLink>
      </p>
    </AppCard>

    <EmptyState
      v-else-if="notFound"
      :level="1"
      icon="certificate"
      title="Certificate not found"
      description="No certificate matches this ID. Check the number and try again."
    >
      <p class="type-help font-mono break-all">{{ certificateNumber }}</p>
      <AppButton :to="{ name: R.CERTIFICATE_LOOKUP }">Check another ID</AppButton>
    </EmptyState>

    <ErrorState v-else :level="1" :error="query.error.value" subject="the certificate" @retry="query.refetch()" />
  </div>
</template>
