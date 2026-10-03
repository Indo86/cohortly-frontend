<script setup>
// The heading of a section inside a page (an <h2>), with an optional description and actions.
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  id: { type: String, default: undefined },
})
</script>

<template>
  <div class="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
    <div class="min-w-0">
      <h2 :id="id" class="type-section-title break-words">{{ title }}</h2>
      <p v-if="description" class="type-meta mt-0.5">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
