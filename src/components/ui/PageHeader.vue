<script setup>
// The top of every page: optional back link (slot "back"), the page title (the one <h1>), a one
// line description and the page's primary actions (slot "actions"). Same spacing everywhere.
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <header class="mb-8 md:mb-12">
    <div v-if="$slots.back" class="mb-3 text-sm"><slot name="back" /></div>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 class="type-page-title break-words">{{ title }}</h1>
        <p v-if="description" class="type-body mt-3 max-w-2xl">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap gap-2">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
