<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import { formatDate } from '@/utils/date.js'
import BrandMark from '@/components/ui/BrandMark.vue'
import CohortLine from '@/components/ui/CohortLine.vue'

// All printed facts are issued snapshots. Public verification has fewer fields; missing
// lesson/score facts are omitted. No course requests, guessed counts or signatures.
const props = defineProps({ certificate: { type: Object, required: true } })
const issued = computed(() => formatDate(props.certificate.issuedAt))
const verifyTo = computed(() => ({ name: R.CERTIFICATE_VERIFY, params: { certificateNumber: props.certificate.certificateNumber } }))
</script>
<template>
  <article class="certificate-sheet" aria-labelledby="certificate-title">
    <div class="certificate-frame">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <BrandMark />
        <p class="break-all font-mono text-metadata text-ink-2">No. {{ certificate.certificateNumber }}</p>
      </header>
      <div>
        <h2 id="certificate-title" class="certificate-title">Certificate of Completion</h2>
        <p class="certificate-lead">This certifies that</p>
        <p class="certificate-name" data-testid="certificate-student">{{ certificate.studentName }}</p>
        <p class="certificate-lead">has successfully completed the course</p>
        <p class="certificate-course" data-testid="certificate-course">{{ certificate.courseName }}</p>
        <p v-if="Number.isFinite(certificate.totalLessons)" class="type-meta mt-3">{{ certificate.totalLessons }} lessons completed</p>
      </div>
      <div class="mt-8 flex items-center gap-6" aria-hidden="true">
        <!-- the completed course line, running on to the seal at the terminus -->
        <div class="relative flex flex-1 items-center">
          <div class="absolute inset-x-0 top-1/2 h-px bg-ink" />
          <CohortLine v-if="certificate.totalLessons" :total="certificate.totalLessons" :completed="certificate.totalLessons" monochrome class="relative" />
        </div>
        <svg class="h-20 w-20 shrink-0 md:h-24 md:w-24" viewBox="0 0 100 100" focusable="false">
          <circle cx="50" cy="50" r="47" fill="var(--accent)" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="var(--ink)" stroke-width="0.75" />
          <circle cx="50" cy="50" r="29" fill="none" stroke="var(--ink)" stroke-width="0.75" />
          <path d="M36 49L46 59L64 39" fill="none" stroke="var(--ink)" stroke-width="2.5" />
          <text x="50" y="19" text-anchor="middle" class="font-mono" font-size="5" fill="var(--ink)" letter-spacing="1">COHORTLY</text>
          <text x="50" y="86" text-anchor="middle" class="font-mono" font-size="5" fill="var(--ink)" letter-spacing="1">COMPLETED</text>
        </svg>
      </div>
      <dl class="certificate-details">
        <div><dt>Issued</dt><dd data-testid="certificate-issued">{{ issued }}</dd></div>
        <div><dt>Instructor</dt><dd data-testid="certificate-instructor">{{ certificate.instructorName }}</dd></div>
        <div><dt>Certificate ID</dt><dd class="font-mono text-metadata" data-testid="certificate-number">{{ certificate.certificateNumber }}</dd><dd class="mt-2"><RouterLink :to="verifyTo" class="break-all text-metadata underline underline-offset-2">Verify this certificate</RouterLink></dd></div>
      </dl>
    </div>
  </article>
</template>
