<script setup>
import { R } from '@/constants/routes.js'
import AppButton from '@/components/ui/AppButton.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
</script>

<template>
  <ErrorState :level="1" title="You do not have access to this page" message="Your account is not allowed to open this page.">
    <AppButton :to="{ name: R.HOME }" variant="secondary">Back to start</AppButton>
  </ErrorState>
</template>
