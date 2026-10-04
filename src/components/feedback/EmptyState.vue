<script setup>
import CohortLine from '@/components/ui/CohortLine.vue'

// "There is nothing here (yet)": says what is missing and offers the next step in the slot.
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: 'document' },
  // a page-level state (not found) is the page's <h1>; inside a page it is an <h2>
  level: { type: Number, default: 2 },
})
</script>

<template>
  <div class="flex flex-col items-start gap-3 border-y border-line px-4 py-12 text-left md:px-6">
    <CohortLine :total="3" class="!w-32" />
    <component :is="`h${level}`" class="type-section-title mt-1">{{ title }}</component>
    <p v-if="description" class="type-meta max-w-md">{{ description }}</p>
    <div v-if="$slots.default" class="mt-3 flex flex-wrap justify-start gap-2">
      <slot />
    </div>
  </div>
</template>
