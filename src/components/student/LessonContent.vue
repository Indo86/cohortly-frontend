<script setup>
import { computed, ref } from 'vue'
import { useScrollRegions } from '@/composables/useScrollRegions.js'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// The body of one lesson.
//
// TEXT  - `lesson.text` is rendered with v-html. This is the ONLY place the Student app uses
//         v-html and it is safe ONLY because of this trust boundary: the backend runs
//         sanitizeRichText() (allow-list of tags, attributes, styles and URL schemes) on
//         every lesson it returns from GET /api/students-courses/:courseId/lessons/:lessonId.
//         The browser never sends this HTML back, nothing is re-enabled here, and no other
//         field (titles, names, ...) is ever passed to v-html - those use text interpolation.
//         Wide tables scroll inside their figure, which becomes keyboard-focusable and labelled
//         only while it overflows (useScrollRegions).
// VIDEO - the iframe URL is built here from the backend's youtubeId, after checking it has
//         the shape the backend stores ([A-Za-z0-9_-], 4-64). No other URL is ever embedded.
const props = defineProps({
  lesson: { type: Object, required: true },
})

const YOUTUBE_ID = /^[A-Za-z0-9_-]{4,64}$/

const embedUrl = computed(() =>
  YOUTUBE_ID.test(props.lesson.youtubeId ?? '')
    ? `https://www.youtube.com/embed/${encodeURIComponent(props.lesson.youtubeId)}`
    : null
)

const prose = ref(null)

useScrollRegions(prose, () => props.lesson.text)
</script>

<template>
  <div v-if="lesson.type === 'video'">
    <div v-if="embedUrl" class="aspect-video w-full overflow-hidden rounded-card bg-ink shadow-card" data-testid="video-frame">
      <iframe
        :src="embedUrl"
        :title="`Video: ${lesson.title}`"
        class="h-full w-full border-0"
        allow="fullscreen; picture-in-picture; encrypted-media"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
        loading="lazy"
      />
    </div>
    <InlineAlert v-else tone="warning">This video cannot be shown right now.</InlineAlert>
  </div>

  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-else-if="lesson.text" ref="prose" class="lesson-prose" data-testid="lesson-text" v-html="lesson.text" />
  <p v-else class="type-meta">This lesson has no content yet.</p>
</template>
