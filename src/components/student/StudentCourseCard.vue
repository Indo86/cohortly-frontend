<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { certificateAction, courseAction, courseRoute, courseState, lessonCountText } from '@/utils/studentCourse.js'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'

// One enrolled course. Every figure (counts, percent, completed, next lesson) is the
// backend's; the state words and the action are chosen from those fields, never computed.
const props = defineProps({
  course: { type: Object, required: true },
})

const state = computed(() => courseState(props.course.progress, props.course.quiz))
const action = computed(() => courseAction(props.course))
const certificate = computed(() => certificateAction(props.course))
</script>

<template>
  <li class="card-row flex flex-col gap-4 sm:flex-row sm:items-center">
    <div class="flex min-w-0 flex-1 items-start gap-4">
      <img :src="course.thumbnail_url" alt="" class="h-16 w-24 shrink-0 rounded-control bg-line object-cover sm:h-24 sm:w-36">

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 class="type-card-title min-w-0 break-words">
            <RouterLink :to="courseRoute(course._id)" class="hover:underline">{{ course.name }}</RouterLink>
          </h3>
          <StatusBadge kind="learning" :status="state" />
        </div>
        <p v-if="course.tagline || course.category?.name" class="type-meta mt-1">
          <span v-if="course.category?.name">{{ course.category.name }}</span>
          <span v-if="course.tagline && course.category?.name"> · </span>
          <span v-if="course.tagline">{{ course.tagline }}</span>
        </p>

        <div class="mt-3 max-w-md">
          <ProgressBar
            :percent="course.progress.percent"
            :completed="course.progress.completed"
            :label="`Progress in ${course.name}`"
            :text="`${lessonCountText(course.progress)} · ${course.progress.percent}%${course.progress.completed ? ' · Completed' : ''}`"
          />
        </div>

        <p v-if="course.nextLesson" class="type-body mt-2">
          <span class="font-medium">Next:</span> {{ course.nextLesson.title }}
          <span v-if="course.nextLesson.sectionTitle" class="text-ink-muted">· {{ course.nextLesson.sectionTitle }}</span>
        </p>
        <p v-else-if="course.nextActivity?.type === 'quiz'" class="type-body mt-2">
          <span class="font-medium">Next:</span> Final quiz
        </p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 sm:shrink-0 sm:flex-col sm:items-stretch">
      <AppButton :variant="action.variant" :to="action.to" :aria-label="`${action.label}: ${course.name}`">{{ action.label }}</AppButton>
      <AppButton v-if="certificate" variant="secondary" :to="certificate.to" :aria-label="`${certificate.label}: ${course.name}`">{{ certificate.label }}</AppButton>
    </div>
  </li>
</template>
