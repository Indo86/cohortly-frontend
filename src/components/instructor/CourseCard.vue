<script setup>
import CourseCover from '@/components/ui/CourseCover.vue'
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import AppButton from '@/components/ui/AppButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import CourseStatusAction from './CourseStatusAction.vue'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import DeleteCourseButton from './DeleteCourseButton.vue'

// One course in the list. Fields come from GET /api/courses (the list does not return
// section or lesson counts, so none are shown). The card itself is not clickable (the title
// and "Open" are), so it does not react to hover. On a phone the thumbnail shrinks and the
// actions wrap below, so the card stays short and every action stays reachable.
defineProps({
  course: { type: Object, required: true },
})
</script>

<template>
  <li class="card-row flex flex-col gap-4 sm:flex-row sm:items-center">
    <div class="flex min-w-0 flex-1 items-center gap-4">
      <CourseCover :course="course" class="w-[4.5rem] md:w-24 xl:w-32" />
      <div class="min-w-0">
        <h2 class="type-card-title break-words">
          <RouterLink :to="{ name: R.INSTRUCTOR_COURSE, params: { courseId: course._id } }" class="hover:underline">
            {{ course.name }}
          </RouterLink>
        </h2>
        <p class="type-meta mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge :status="course.status" />
          <span>{{ course.category?.name ?? 'No category' }}</span>
          <span>{{ course.total_students }} {{ course.total_students === 1 ? 'student' : 'students' }}</span>
        </p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
      <AppButton variant="secondary" :to="{ name: R.INSTRUCTOR_COURSE, params: { courseId: course._id } }" :aria-label="`Open ${course.name}`">
        Open
      </AppButton>
      <ActionMenu :label="'More actions for ' + course.name">
      <CourseStatusAction :course-id="course._id" :status="course.status" :course-name="course.name" />
      <DeleteCourseButton :course="course" />
      </ActionMenu>
    </div>
  </li>
</template>
