<script setup>
// Page width. Content never stretches edge to edge on a wide screen:
//   content  (default) lists, dashboards, editors     72rem
//   form     a single form or settings card           42rem
//   reading  lesson text                              44rem
defineProps({
  size: { type: String, default: 'content' }, // content | form | reading
})

const WIDTHS = { content: 'max-w-content', form: 'max-w-form', reading: 'max-w-reading' }
</script>

<template>
  <div class="mx-auto w-full" :class="WIDTHS[size] ?? WIDTHS.content">
    <slot />
  </div>
</template>
