<script setup>
import { computed } from 'vue'

const props = defineProps({
  stations: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  completed: { type: Number, default: 0 },
  monochrome: { type: Boolean, default: false },
})
// With only aggregate counts, represent completed/upcoming counts, never infer lesson ids.
const points = computed(() => props.stations.length ? props.stations : Array.from({ length: Math.max(0, props.total) }, (_, i) => ({ state: i < props.completed ? 'done' : i === props.completed ? 'current' : 'upcoming' })))
const width = computed(() => Math.max(40, points.value.length * 28))
const color = (state) => props.monochrome ? 'var(--ink)' : state === 'done' ? 'var(--primary)' : state === 'current' ? 'var(--accent)' : 'var(--line-strong)'
</script>

<template>
  <svg v-if="points.length" :viewBox="'0 0 ' + width + ' 32'" class="h-8 w-full max-w-lg" preserveAspectRatio="xMinYMid meet" aria-hidden="true" focusable="false">
    <g v-for="(station, i) in points" :key="i">
      <path v-if="i < points.length - 1" :d="'M' + (14 + i * 28) + ' 16h28'" :stroke="color(station.state === 'done' ? 'done' : 'upcoming')" stroke-width="2" :stroke-dasharray="station.state === 'done' ? undefined : '2 4'" />
      <circle v-if="station.state === 'current'" :cx="14 + i * 28" cy="16" r="10" :fill="color('current')" opacity="0.3" />
      <circle :cx="14 + i * 28" cy="16" r="5" :fill="station.state === 'upcoming' ? 'var(--surface)' : color(station.state)" :stroke="color(station.state)" stroke-width="1.5" />
      <circle v-if="station.quiz" :cx="14 + i * 28" cy="16" r="9" fill="none" :stroke="color(station.state)" stroke-width="1.5" />
    </g>
  </svg>
</template>
