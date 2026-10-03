<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useMyCertificateQuery } from '@/composables/studentQueries.js'
import { courseRoute } from '@/utils/studentCourse.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import CertificateDocument from '@/components/student/CertificateDocument.vue'
import DataState from '@/components/feedback/DataState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { ErrorKind } from '@/services/apiError.js'

// One of the student's certificates, ready to print or save as PDF with the browser's own Print
// command (no server-side PDF). Printing shows ONLY the certificate: the navigation, the page
// header and the buttons are print:hidden and the sheet has its own A4 landscape page style.
// This route has no active-workspace requirement: an issued certificate stays viewable.
const props = defineProps({
  certificateNumber: { type: String, required: true },
})

const query = useMyCertificateQuery(computed(() => props.certificateNumber))
const certificate = computed(() => query.data.value ?? null)
const notFound = computed(() => query.error.value?.kind === ErrorKind.NOT_FOUND)

const print = () => window.print()
</script>

<template>
  <div>
    <p class="mb-4 text-sm print:hidden">
      <RouterLink :to="{ name: R.STUDENT_CERTIFICATES }" class="back-link">← All certificates</RouterLink>
    </p>

    <EmptyState
      v-if="notFound"
      :level="1"
      icon="certificate"
      title="Certificate not found"
      description="This certificate does not exist, or it belongs to another account."
    >
      <AppButton :to="{ name: R.STUDENT_CERTIFICATES }">Back to certificates</AppButton>
    </EmptyState>

    <DataState
      v-else
      :pending="query.isPending.value"
      :error="query.error.value"
      subject="the certificate"
      loading-label="Loading the certificate…"
      @retry="query.refetch()"
    >
      <template v-if="certificate">
        <h1 class="sr-only">Certificate of Completion: {{ certificate.courseName }}</h1>

        <div class="mb-6 flex flex-wrap items-center gap-3 print:hidden" role="group" aria-label="Certificate actions">
          <AppButton @click="print">
            <AppIcon name="print" class="h-4 w-4" />
            Print / Save as PDF
          </AppButton>
          <AppButton variant="secondary" :to="{ name: R.CERTIFICATE_VERIFY, params: { certificateNumber: certificate.certificateNumber } }">
            Verify certificate
          </AppButton>
          <AppButton variant="ghost" :to="courseRoute(certificate.course)">Back to course</AppButton>
        </div>

        <CertificateDocument :certificate="certificate" />

        <p class="type-help mt-4 print:hidden">
          To save a PDF, choose “Save as PDF” as the destination in the print window. Anyone can check this certificate with its ID on the verification page.
        </p>
      </template>
    </DataState>
  </div>
</template>
