<script setup>
// The first Tab stop of every page: visible only while focused, jumps to <main id="main">.
</script>

<template>
  <a
    href="#main"
    class="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:shadow-overlay"
  >
    Skip to content
  </a>
</template>
