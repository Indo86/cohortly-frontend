<script setup>
import AppSpinner from '@/components/ui/AppSpinner.vue'

// Skeleton loaders were evaluated and not adopted: the product's pages are short lists and
// forms whose shapes differ from page to page, so skeletons would mean one duplicated
// template per page for a wait that is usually well under a second. A fixed-height spinner
// with a specific label ("Loading your courses…") avoids layout jumps and is announced to
// screen readers (role="status").
defineProps({
  label: { type: String, default: 'Loading…' },
})
</script>

<template>
  <div class="flex min-h-[10rem] items-center justify-center gap-3 p-8 text-ink-muted" role="status">
    <AppSpinner />
    <span class="text-sm">{{ label }}</span>
  </div>
</template>
