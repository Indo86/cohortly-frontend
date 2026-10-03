<script setup>
import { computed, ref } from 'vue'
import { R } from '@/constants/routes.js'
import { useCoursesQuery } from '@/composables/instructorQueries.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import CourseCard from '@/components/instructor/CourseCard.vue'
import DataState from '@/components/feedback/DataState.vue'

// The backend has no search or pagination for courses, so the filter below works on the
// courses already loaded (an instructor's own list) and says so.
const courses = useCoursesQuery()
const filter = ref('')

const all = computed(() => courses.data.value ?? [])
const shown = computed(() => {
  const needle = filter.value.trim().toLowerCase()

  return needle ? all.value.filter((course) => course.name.toLowerCase().includes(needle)) : all.value
})
</script>

<template>
  <div>
    <PageHeader title="Courses" description="Build courses from sections and lessons, then publish them to your students.">
      <template #actions>
        <AppButton :to="{ name: R.INSTRUCTOR_COURSE_NEW }">New course</AppButton>
      </template>
    </PageHeader>

    <DataState
      :pending="courses.isPending.value"
      :error="courses.error.value"
      :empty="all.length === 0"
      subject="your courses"
      loading-label="Loading your courses…"
      empty-icon="courses"
      empty-title="You have no courses yet"
      empty-description="Create your first course, add sections and lessons, then publish it."
      @retry="courses.refetch()"
    >
      <template #empty-actions>
        <AppButton :to="{ name: R.INSTRUCTOR_COURSE_NEW }">Create your first course</AppButton>
      </template>

      <div v-if="all.length > 1" class="mb-4 max-w-sm">
        <AppInput v-model="filter" label="Filter courses by name" type="search" hint="Filters the courses shown below." />
      </div>

      <p v-if="shown.length === 0" class="card type-meta p-6 text-center">
        No course matches “{{ filter }}”.
      </p>
      <ul v-else class="flex flex-col gap-3">
        <CourseCard v-for="course in shown" :key="course._id" :course="course" />
      </ul>
    </DataState>
  </div>
</template>
