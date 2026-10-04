<script setup>
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
defineProps({ course: { type: Object, required: true }, currentLesson: { type: String, default: '' } })
</script>
<template>
  <nav aria-label="Editor outline" class="min-w-0 bg-paper-sunk p-4">
    <h3 class="type-eyebrow mb-6">Course outline</h3>
    <ol class="space-y-6">
      <li v-for="(section, index) in course.sections" :key="section._id">
        <p class="type-eyebrow">Section {{ String(index + 1).padStart(2, '0') }}</p>
        <p class="mt-1 break-words text-body font-semibold">{{ section.title }}</p>
        <ol class="ml-2 mt-3 border-l border-line-strong pl-4">
          <li v-for="lesson in section.lessons" :key="lesson._id" class="relative">
            <span class="absolute -left-[1.3125rem] top-4 h-2 w-2 rounded-full border border-line-strong bg-paper-sunk" aria-hidden="true" />
            <RouterLink :to="{ name: R.INSTRUCTOR_LESSON_EDIT, params: { courseId: course._id, lessonId: lesson._id } }" class="flex min-h-11 items-center rounded-sm px-2 py-2 text-sm" :class="lesson._id === currentLesson ? 'bg-primary-tint font-semibold text-primary-dark' : 'text-ink-2 hover:bg-surface'" :aria-current="lesson._id === currentLesson ? 'page' : undefined">{{ lesson.title }}</RouterLink>
          </li>
        </ol>
      </li>
    </ol>
    <RouterLink :to="{ name: R.INSTRUCTOR_COURSE, params: { courseId: course._id } }" class="back-link mt-6">Manage sections</RouterLink>
  </nav>
</template>
