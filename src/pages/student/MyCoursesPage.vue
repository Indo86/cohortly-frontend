<script setup>
import { computed } from 'vue'
import { useStudentCoursesQuery } from '@/composables/studentQueries.js'
import PageHeader from '@/components/ui/PageHeader.vue'
import StudentCourseCard from '@/components/student/StudentCourseCard.vue'
import StudentQueryState from '@/components/student/StudentQueryState.vue'

// The student's enrolled, published courses exactly as the backend returns them. Draft
// courses never reach the browser, so nothing here says anything about drafts.
const courses = useStudentCoursesQuery()
const list = computed(() => courses.data.value ?? [])
</script>

<template>
  <div>
    <PageHeader title="My Courses" description="The courses you are enrolled in." />

    <StudentQueryState
      :pending="courses.isPending.value"
      :error="courses.error.value"
      :empty="list.length === 0"
      subject="your courses"
      loading-label="Loading your courses…"
      empty-title="You are not enrolled in any course yet"
      empty-description="When your instructor enrolls you in a published course, it appears here."
      @retry="courses.refetch()"
    >
      <ul class="flex flex-col gap-3">
        <StudentCourseCard v-for="course in list" :key="course._id" :course="course" />
      </ul>
    </StudentQueryState>
  </div>
</template>
