<script setup>
import { computed } from 'vue'

// Displays progress that the BACKEND computed. It never calculates a percentage itself: the
// width is the backend's `percent` and the text states the backend's counts. Completed
// progress turns green AND says so in words (the text prop), never colour alone.
const props = defineProps({
  percent: { type: Number, required: true }, // 0-100, from the API
  label: { type: String, required: true }, // accessible name, e.g. "Progress of Ada"
  text: { type: String, default: '' }, // visible description, e.g. "3 of 5 lessons"
  completed: { type: Boolean, default: false },
})

const width = computed(() => `${Math.min(100, Math.max(0, props.percent))}%`)
</script>

<template>
  <div>
    <div
      class="h-2 w-full overflow-hidden rounded-full bg-line"
      role="progressbar"
      :aria-label="label"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="percent"
      :aria-valuetext="text ? `${percent}%, ${text}` : `${percent}%`"
    >
      <div class="h-full rounded-full transition-[width] duration-300" :class="completed ? 'bg-success' : 'bg-primary'" :style="{ width }" />
    </div>
    <p v-if="text" class="type-help mt-1.5">{{ text }}</p>
  </div>
</template>
