<script setup>
// A content panel: border, radius and shadow come from the card tokens. Cards that are not
// clickable never change on hover.
defineProps({
  as: { type: String, default: 'section' },
})
</script>

<template>
  <component :is="as" class="card p-4 sm:p-6">
    <slot />
  </component>
</template>
