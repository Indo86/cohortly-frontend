<script setup>
import { RouterView } from 'vue-router'
import { R } from '@/constants/routes.js'
import { studentNav } from '@/constants/navigation.js'
import { useAuthStore } from '@/stores/auth.js'
import AppShell from './AppShell.vue'

const auth = useAuthStore()
</script>

<template>
  <AppShell
    :items="studentNav"
    :home-to="{ name: auth.isActive ? R.STUDENT_DASHBOARD : R.STUDENT_WORKSPACE_INACTIVE }"
    area-label="Learning"
  >
    <RouterView />
  </AppShell>
</template>
