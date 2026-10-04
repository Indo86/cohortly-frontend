<script setup>
// One real number from the backend. Never fed with computed or invented values.
defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], required: true },
})
</script>

<template>
  <div class="min-w-0 border-l border-line px-4 py-6 first:border-l-0 md:px-6">
    <dt class="type-meta">{{ label }}</dt>
    <dd class="mt-2 font-display text-4xl font-medium tabular-nums tracking-tight text-ink xl:text-metric">{{ value }}</dd>
  </div>
</template>
