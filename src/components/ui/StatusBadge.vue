<script setup>
import { computed } from 'vue'
import { statusFor } from '@/constants/status.js'
import AppBadge from './AppBadge.vue'

// The single way a status is shown. `kind` picks the vocabulary (see constants/status.js):
// course (default), learning, subscription, workspace. The label is always text.
const props = defineProps({
  status: { type: String, required: true },
  kind: { type: String, default: 'course' },
})

const entry = computed(() => statusFor(props.kind, props.status))
</script>

<template>
  <AppBadge :tone="entry.tone">{{ entry.label }}</AppBadge>
</template>
