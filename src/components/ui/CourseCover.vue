<script setup>
import { computed, useId } from 'vue'
import { courseArtwork } from '@/utils/courseArtwork.js'

const props = defineProps({
  course: { type: Object, required: true },
  small: { type: Boolean, default: false },
  showUpload: { type: Boolean, default: false },
})
const uid = useId().replace(/:/g, '')
const art = computed(() => courseArtwork(props.course))
const palette = computed(() => ({
  '--cover-ground': 'var(--art-' + art.value.palette + '-ground)',
  '--cover-figure': 'var(--art-' + art.value.palette + '-figure)',
}))
</script>

<template>
  <div class="course-cover relative isolate aspect-[4/3] shrink-0 overflow-hidden rounded-lg" :style="palette" aria-hidden="true" :data-family="art.family">
    <svg viewBox="0 0 320 240" class="h-full w-full" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs>
        <pattern :id="uid + '-grain'" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="var(--cover-figure)" opacity="0.14" />
        </pattern>
      </defs>
      <rect width="320" height="240" fill="var(--cover-ground)" />
      <rect v-if="!small" width="320" height="240" :fill="'url(#' + uid + '-grain)'" />
      <g fill="var(--cover-figure)" stroke="var(--cover-figure)">
        <g v-if="art.family === 'lattice'">
          <circle :cx="180 + art.offset" cy="128" r="84" fill="none" stroke-width="1.5" opacity="0.6" />
          <circle v-for="n in 35" :key="n" :cx="40 + ((n - 1) % 7) * 40" :cy="48 + Math.floor((n - 1) / 7) * 36" r="2" stroke="none" opacity="0.5" />
          <path d="M40 174H90L134 130H192L236 174H278" fill="none" stroke-width="3" />
          <circle v-for="(point, i) in [[40,174],[90,174],[134,130],[192,130],[236,174],[278,174]].slice(0, art.density)" :key="i" :cx="point[0]" :cy="point[1]" :r="i === 5 ? 9 : 5" :fill="i === 5 ? 'var(--cover-ground)' : 'var(--cover-figure)'" stroke-width="2" />
        </g>
        <g v-else-if="art.family === 'blocks'" :transform="'translate(0,' + (art.offset / 3) + ')'">
          <rect v-for="n in art.density" :key="n" :x="32 + ((n - 1) % 3) * 88" :y="56 + Math.floor((n - 1) / 3) * 38" :width="72" height="26" rx="3" :fill="n === 3 ? 'none' : 'var(--cover-figure)'" :opacity="n === 3 ? 1 : 0.3 + ((art.seed >>> n) % 6) / 10" stroke-width="2" />
          <path d="M32 216H280" fill="none" opacity="0.5" />
        </g>
        <g v-else-if="art.family === 'bearings'" :transform="'translate(' + art.offset + ',0)'">
          <path v-for="n in 6" :key="n" :d="'M' + (35 + n * 34) + ' 218A' + (n * 34) + ' ' + (n * 34) + ' 0 0 0 35 ' + (218 - n * 34)" fill="none" :stroke-width="n === 4 ? 3 : 1.5" :opacity="n === 4 ? 1 : 0.5" />
          <path d="M119 112L139 112L139 132Z" stroke="none" />
        </g>
        <g v-else-if="art.family === 'rings'">
          <circle v-for="n in 5" :key="n" :cx="170 + art.offset" cy="118" :r="n * 18" fill="none" :stroke-width="n === 3 ? 9 : 2" :opacity="n === 3 ? 0.85 : 0.5" stroke-dasharray="240 60" :transform="'rotate(' + (art.seed % 4 * 90) + ' 180 118)'" />
          <rect v-for="n in 6" :key="n" :x="32 + n * 18" :y="218 - n * 6" width="10" :height="n * 6" stroke="none" />
        </g>
        <g v-else-if="art.family === 'overlap'">
          <circle :cx="104 + art.offset" cy="125" r="64" stroke="none" opacity="0.9" />
          <rect :x="144 + art.offset" y="92" width="110" height="110" rx="3" fill="none" stroke-width="3" />
          <path d="M210 218A50 50 0 0 1 310 218Z" stroke="none" opacity="0.55" />
        </g>
        <g v-else>
          <text :x="158 + art.offset" y="257" class="font-display" font-size="280" font-weight="500" stroke="none">{{ art.initial }}</text>
          <path d="M28 150H150M28 166H150M28 182H150" fill="none" stroke-width="1.5" opacity="0.65" />
        </g>
      </g>
      <text v-if="!small" x="20" y="32" fill="var(--cover-figure)" class="font-mono" font-size="14" letter-spacing="1">{{ art.code }}</text>
    </svg>
    <!-- Uploads remain editable and can be previewed in the approved two-colour frame. -->
    <img v-if="showUpload && course.thumbnail_url" :src="course.thumbnail_url" alt="" class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity" loading="lazy">
  </div>
</template>
