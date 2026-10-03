<script setup>
// One real number from the backend. Never fed with computed or invented values.
defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], required: true },
})
</script>

<template>
  <div class="card p-4">
    <dt class="type-meta">{{ label }}</dt>
    <dd class="mt-1 text-3xl font-bold leading-9 tracking-tight text-ink">{{ value }}</dd>
  </div>
</template>
