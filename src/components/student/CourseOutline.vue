<script setup>
import { RouterLink } from 'vue-router'
import { lessonRoute } from '@/utils/studentCourse.js'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

// The course outline. Order, grouping, completion and the section counts are exactly what
// the backend returned; the "Up next" marker is the backend's nextLesson. Sections are
// stacked lists (no collapsing) so the whole course reads top to bottom on a phone, and
// every lesson is a real link, so the outline works with the keyboard. Completion is shown
// with an icon AND the words "Completed" / "Not completed", never colour alone.
defineProps({
  courseId: { type: String, required: true },
  sections: { type: Array, required: true },
  nextLessonId: { type: String, default: null },
})
</script>

<template>
  <nav aria-label="Course outline">
    <ol class="flex flex-col gap-5">
      <li v-for="(section, index) in sections" :key="section._id" class="syllabus-section">
        <section :aria-labelledby="`section-${section._id}`">
          <header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-4">
            <h3 :id="`section-${section._id}`" class="type-card-title min-w-0 break-words">
              <span class="mr-2 font-mono text-metadata uppercase tracking-wide text-ink-3">Section {{ index + 1 }}:</span> {{ section.title }}
            </h3>
            <p class="type-help">{{ section.completedLessons }} of {{ section.totalLessons }} completed</p>
          </header>

          <ol class="syllabus-lessons ml-6 border-l border-line-strong">
            <li v-for="lesson in section.lessons" :key="lesson._id">
              <RouterLink
                :to="lessonRoute(courseId, lesson._id)"
                class="relative flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3 hover:bg-paper-sunk"
                :class="lesson._id === nextLessonId ? 'bg-primary-tint' : ''"
              >
                <span class="absolute -left-[0.375rem] top-6 h-3 w-3 rounded-full border" :class="lesson.completed ? 'border-primary bg-primary' : lesson._id === nextLessonId ? 'border-accent bg-accent ring-4 ring-accent/30' : 'border-line-strong bg-paper'" aria-hidden="true" />
                <AppIcon v-if="lesson.completed" name="check-circle" class="h-5 w-5 shrink-0 text-success" />
                <AppIcon v-else name="circle" class="h-5 w-5 shrink-0 text-ink-muted" />

                <span class="min-w-0 flex-1 basis-40 break-words text-sm text-ink" :class="lesson._id === nextLessonId ? 'font-semibold' : ''">{{ lesson.title }}</span>

                <span class="flex shrink-0 flex-wrap items-center gap-1.5">
                  <AppBadge v-if="lesson._id === nextLessonId" tone="info">Up next</AppBadge>
                  <AppBadge :tone="lesson.completed ? 'success' : 'neutral'">{{ lesson.completed ? 'Completed' : 'Not completed' }}</AppBadge>
                  <AppBadge>{{ lesson.type === 'video' ? 'Video' : 'Text' }}</AppBadge>
                </span>
              </RouterLink>
            </li>
          </ol>
        </section>
      </li>
    </ol>
  </nav>
</template>
