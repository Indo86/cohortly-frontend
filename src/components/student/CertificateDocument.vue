<script setup>
import { computed } from 'vue'
import { APP_NAME } from '@/constants/app.js'
import { formatDate } from '@/utils/date.js'
import BrandMark from '@/components/ui/BrandMark.vue'

// The certificate exactly as it is printed. Every value is the ISSUED record from the backend
// (names are snapshots taken when it was issued); nothing is recomputed here, and there is no
// signature image, score or points. Styled for the screen and for print (see `.certificate-sheet`
// in style.css: it prints alone on an A4 landscape page).
const props = defineProps({
  certificate: { type: Object, required: true }, // { certificateNumber, studentName, courseName, instructorName, issuedAt }
})

const issued = computed(() => formatDate(props.certificate.issuedAt))
</script>

<template>
  <article class="certificate-sheet" aria-labelledby="certificate-title">
    <div class="certificate-frame">
      <BrandMark />
      <p class="type-eyebrow mt-8">{{ APP_NAME }}</p>
      <h2 id="certificate-title" class="certificate-title">Certificate of Completion</h2>

      <p class="certificate-lead">This certifies that</p>
      <p class="certificate-name" data-testid="certificate-student">{{ certificate.studentName }}</p>
      <p class="certificate-lead">has successfully completed the course</p>
      <p class="certificate-course" data-testid="certificate-course">{{ certificate.courseName }}</p>

      <dl class="certificate-details">
        <div>
          <dt>Issued</dt>
          <dd data-testid="certificate-issued">{{ issued }}</dd>
        </div>
        <div>
          <dt>Instructor</dt>
          <dd data-testid="certificate-instructor">{{ certificate.instructorName }}</dd>
        </div>
        <div>
          <dt>Certificate ID</dt>
          <dd class="font-mono tracking-wide" data-testid="certificate-number">{{ certificate.certificateNumber }}</dd>
        </div>
      </dl>
    </div>
  </article>
</template>
