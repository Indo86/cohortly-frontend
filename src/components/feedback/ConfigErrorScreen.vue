<script setup>
// Shown instead of the app when required configuration is missing or invalid.
defineProps({
  problems: { type: Array, required: true },
})
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6 text-ink">
    <h1 class="text-2xl font-bold">Configuration problem</h1>
    <p class="text-sm text-ink-soft">The app cannot start until this is fixed:</p>
    <ul class="list-disc space-y-1 pl-5 text-sm text-danger-strong">
      <li v-for="problem in problems" :key="problem">{{ problem }}</li>
    </ul>
  </div>
</template>
