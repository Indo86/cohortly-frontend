<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useCategoriesQuery, useCourseQuery } from '@/composables/instructorQueries.js'
import { useUpdateCourse } from '@/composables/instructorMutations.js'
import { useRouteParam } from '@/composables/useRouteParam.js'
import AppCard from '@/components/ui/AppCard.vue'
import CourseForm from '@/components/instructor/CourseForm.vue'
import DeleteCourseButton from '@/components/instructor/DeleteCourseButton.vue'
import DataState from '@/components/feedback/DataState.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'

// Settings tab: edit the course details (the stored category and thumbnail are pre-filled; the
// status is not part of this form) and delete the course.
const router = useRouter()
const courseId = useRouteParam('courseId')
const course = useCourseQuery(courseId)
const categories = useCategoriesQuery()
const update = useUpdateCourse(courseId)

const ready = computed(() => course.data.value && categories.data.value)

const submit = async (form) => {
  try {
    // the "Course saved." confirmation is the toast shown by the mutation
    await update.mutateAsync(form)
  } catch {
    // shown by the form (update.error)
  }
}
</script>

<template>
  <div class="flex max-w-form flex-col gap-6">
    <AppCard>
      <SectionHeader title="Course details" />
      <DataState
        :pending="categories.isPending.value"
        :error="categories.error.value"
        subject="the categories"
        loading-label="Loading categories…"
        @retry="categories.refetch()"
      >
        <CourseForm
          v-if="ready"
          :course="course.data.value"
          :categories="categories.data.value"
          :pending="update.isPending.value"
          :server-error="update.error.value"
          submit-label="Save changes"
          @submit="submit"
        />
      </DataState>
    </AppCard>

    <AppCard v-if="course.data.value" class="border-danger/30">
      <SectionHeader title="Delete this course" description="Permanently removes the course, its sections and lessons, and every student’s progress in it. This cannot be undone." />
      <DeleteCourseButton :course="course.data.value" variant="danger-outline" @deleted="router.replace({ name: R.INSTRUCTOR_COURSES })" />
    </AppCard>
  </div>
</template>
