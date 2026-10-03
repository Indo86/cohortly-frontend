<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'

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
  <div class="flex flex-col items-center gap-2 rounded-card border border-dashed border-line-control bg-surface px-4 py-10 text-center">
    <span class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-faint text-primary">
      <AppIcon :name="icon" class="h-6 w-6" />
    </span>
    <component :is="`h${level}`" class="type-card-title mt-1">{{ title }}</component>
    <p v-if="description" class="type-meta max-w-md">{{ description }}</p>
    <div v-if="$slots.default" class="mt-3 flex flex-wrap justify-center gap-2">
      <slot />
    </div>
  </div>
</template>
