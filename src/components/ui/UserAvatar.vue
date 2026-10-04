<script setup>
import { computed, ref } from 'vue'
import { stableHash } from '@/utils/courseArtwork.js'

// Decorative avatar: the person's name is always shown next to it, so the image has an empty
// alt. If the image is missing or fails to load, initials are shown instead.
const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg
})

const failed = ref(false)

const initials = computed(() =>
  props.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
)

const dimension = computed(() => ({ sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-lg' })[props.size])
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    alt=""
    class="shrink-0 rounded-full bg-line object-cover"
    :class="dimension"
    @error="failed = true"
  >
  <span
    v-else
    class="inline-flex shrink-0 items-center justify-center rounded-full font-mono font-medium"
    :class="dimension"
    :style="{ background: 'var(--art-' + (stableHash(name) % 6 + 1) + '-ground)', color: 'var(--art-' + (stableHash(name) % 6 + 1) + '-figure)' }"
    aria-hidden="true"
  >
    {{ initials }}
  </span>
</template>
