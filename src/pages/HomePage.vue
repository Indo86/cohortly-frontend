<script setup>
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import { APP_DESCRIPTION, APP_NAME } from '@/constants/app.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
</script>

<template>
  <AppCard>
    <h1 class="type-page-title">Welcome to {{ APP_NAME }}</h1>
    <p class="type-body mt-2">{{ APP_DESCRIPTION }}</p>
    <div class="mt-6 flex flex-col gap-3">
      <AppButton :to="{ name: R.INSTRUCTOR_SIGN_IN }" block>Instructor sign in</AppButton>
      <AppButton :to="{ name: R.STUDENT_SIGN_IN }" variant="secondary" block>Student sign in</AppButton>
    </div>
    <p class="type-meta mt-6 text-center">
      New organization?
      <RouterLink :to="{ name: R.REGISTER }" class="type-link">Register as an instructor</RouterLink>
    </p>
    <p class="type-meta mt-3 text-center">
      Have a certificate?
      <RouterLink :to="{ name: R.CERTIFICATE_LOOKUP }" class="type-link">Verify it</RouterLink>
    </p>
  </AppCard>
</template>
