<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useMyCertificatesQuery } from '@/composables/studentQueries.js'
import { formatDate } from '@/utils/date.js'
import { certificateRoute } from '@/utils/studentCourse.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import DataState from '@/components/feedback/DataState.vue'
import { R } from '@/constants/routes.js'

// The student's own certificates. They are issued records, so this page (and its API) work even
// while the instructor's subscription is inactive.
const certificates = useMyCertificatesQuery()
const list = computed(() => certificates.data.value ?? [])
</script>

<template>
  <div>
    <PageHeader title="Certificates" description="Certificates you have earned by completing courses." />

    <DataState
      :pending="certificates.isPending.value"
      :error="certificates.error.value"
      :empty="list.length === 0"
      subject="your certificates"
      loading-label="Loading your certificates…"
      empty-title="You have no certificates yet"
      empty-description="You receive a certificate when you complete a course: every lesson, plus the final quiz if the course has one."
      empty-icon="certificate"
      @retry="certificates.refetch()"
    >
      <template #empty-actions>
        <AppButton variant="secondary" :to="{ name: R.STUDENT_COURSES }">Go to My Courses</AppButton>
      </template>

      <ul class="flex flex-col gap-3">
        <li v-for="certificate in list" :key="certificate.certificateNumber" class="card-row flex flex-col gap-4 sm:flex-row sm:items-center">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-faint text-primary">
            <AppIcon name="certificate" class="h-6 w-6" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="type-card-title break-words">{{ certificate.courseName }}</h2>
            <p class="type-meta mt-1">
              Issued {{ formatDate(certificate.issuedAt) }} · Instructor {{ certificate.instructorName }}
            </p>
            <p class="type-help mt-1 font-mono">{{ certificate.certificateNumber }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <AppButton :to="certificateRoute(certificate.certificateNumber)" :aria-label="`View certificate: ${certificate.courseName}`">View</AppButton>
            <AppButton
              variant="secondary"
              :to="{ name: R.CERTIFICATE_VERIFY, params: { certificateNumber: certificate.certificateNumber } }"
              :aria-label="`Verify certificate: ${certificate.courseName}`"
            >
              Verify
            </AppButton>
          </div>
        </li>
      </ul>
      <p class="type-help mt-4">
        Anyone with a certificate number can check it on the
        <RouterLink :to="{ name: R.CERTIFICATE_LOOKUP }" class="type-link">verification page</RouterLink>.
      </p>
    </DataState>
  </div>
</template>
