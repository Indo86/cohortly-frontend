<script setup>
import { R } from '@/constants/routes.js'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
</script>

<template>
  <EmptyState :level="1" title="Page not found" description="The page you are looking for does not exist or has moved.">
    <AppButton :to="{ name: R.HOME }">Back to start</AppButton>
  </EmptyState>
</template>
