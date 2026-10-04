<script setup>
import { computed } from 'vue'
import { R } from '@/constants/routes.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
const props = defineProps({ overview: { type: Object, required: true } })
const firstCourse = computed(() => props.overview.courses?.[0])
const liveCourse = computed(() => props.overview.courses?.find((course) => course.status === 'published' && course.total_students > 0))
const courseTo = (name = R.INSTRUCTOR_COURSE) => firstCourse.value ? { name, params: { courseId: firstCourse.value._id } } : { name: R.INSTRUCTOR_COURSES }
const steps = computed(() => [
  { title: 'Create a course', done: props.overview.totalCourses > 0, description: 'Name your course and choose a category. Its cover is ready from the start.', action: 'Create your first course', to: { name: R.INSTRUCTOR_COURSE_NEW } },
  { title: 'Add lessons', done: props.overview.totalVideos + props.overview.totalTexts > 0, description: 'Group text and video lessons into a clear sequence of sections.', action: 'Open editor', to: courseTo() },
  { title: 'Add students', done: props.overview.totalStudents > 0, description: 'Create student accounts, then enroll them in your courses.', action: 'Add a student', to: { name: R.INSTRUCTOR_STUDENT_NEW } },
  { title: 'Publish', done: props.overview.publishedCourses > 0, description: 'Publish a course when it is ready for your learners.', action: 'Review course', to: courseTo() },
  { title: 'Track learning', done: false, description: 'Follow lesson completion and quiz results in course progress.', action: 'View progress', to: liveCourse.value ? { name: R.INSTRUCTOR_COURSE_PROGRESS, params: { courseId: liveCourse.value._id } } : courseTo(R.INSTRUCTOR_COURSE_PROGRESS) },
])
const current = computed(() => steps.value.findIndex((step) => !step.done))
const count = computed(() => steps.value.filter((step) => step.done).length)
</script>
<template>
  <section class="my-12" aria-labelledby="setup-heading">
    <div class="mb-6 flex flex-wrap items-baseline justify-between gap-3">
      <h2 id="setup-heading" class="type-section-title">{{ current === 4 ? 'Your workspace is ready' : 'Let’s set up your first course' }}</h2>
      <span class="type-eyebrow">{{ current === 4 ? 'Learning is ongoing' : count + ' of 5 complete' }}</span>
    </div>
    <div v-if="current === 4" class="flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
      <p class="type-body">Courses, lessons, and students are in place. Follow their learning from course progress.</p>
      <AppButton variant="secondary" :to="steps[4].to">View progress</AppButton>
    </div>
    <ol v-else class="setup-journey grid gap-6 md:grid-cols-5">
      <li v-for="(step, index) in steps" :key="step.title" class="relative min-w-0 pl-10 md:pl-0" :aria-current="index === current ? 'step' : undefined">
        <span class="journey-station absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded-full border md:relative" :class="step.done ? 'border-primary bg-primary text-on-primary' : index === current ? 'border-accent bg-accent ring-4 ring-accent/30' : 'border-line-strong bg-paper'" aria-hidden="true"><AppIcon v-if="step.done" name="check-circle" class="h-4 w-4" /></span>
        <p class="type-eyebrow md:mt-6">{{ String(index + 1).padStart(2, '0') }}</p>
        <h3 class="mt-1 text-body font-semibold">{{ step.title }}</h3>
        <p v-if="index === current" class="type-body mt-2">{{ step.description }}</p>
        <p v-if="step.done" class="mt-2 text-metadata font-semibold text-success">Done</p>
        <AppButton v-else-if="index === current" :to="step.to" class="mt-4">{{ step.action }}</AppButton>
      </li>
    </ol>
  </section>
</template>
