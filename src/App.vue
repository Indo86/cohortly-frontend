<script setup>
import { ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import LoadingState from '@/components/feedback/LoadingState.vue'

// Nothing is rendered until the first navigation has finished, which includes restoring
// the session from GET /api/me. That is what prevents a flash of protected content.
const router = useRouter()
const ready = ref(false)

router.isReady().then(() => {
  ready.value = true
})
</script>

<template>
  <RouterView v-if="ready" />
  <div v-else class="flex min-h-screen items-center justify-center bg-canvas">
    <LoadingState label="Loading your workspace…" />
  </div>
</template>
