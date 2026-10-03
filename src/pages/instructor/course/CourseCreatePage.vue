<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useCategoriesQuery } from '@/composables/instructorQueries.js'
import { useCreateCourse } from '@/composables/instructorMutations.js'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import CourseForm from '@/components/instructor/CourseForm.vue'
import DataState from '@/components/feedback/DataState.vue'

// New courses are always created as drafts by the backend; the form has no status field.
const router = useRouter()
const categories = useCategoriesQuery()
const create = useCreateCourse()

const submit = async (form) => {
  try {
    const created = await create.mutateAsync(form)

    await router.push({ name: R.INSTRUCTOR_COURSE, params: { courseId: created._id } })
  } catch {
    // the error is shown by the form (create.error)
  }
}
</script>

<template>
  <div>
    <PageHeader title="New course" description="You can add sections and lessons right after. The course stays a draft until you publish it.">
      <template #back>
        <RouterLink :to="{ name: R.INSTRUCTOR_COURSES }" class="back-link">← All courses</RouterLink>
      </template>
    </PageHeader>

    <AppCard class="max-w-form">
      <DataState
        :pending="categories.isPending.value"
        :error="categories.error.value"
        :empty="(categories.data.value ?? []).length === 0"
        subject="the categories"
        loading-label="Loading categories…"
        empty-title="No categories are available"
        empty-description="Courses need a category. Ask your administrator to run the category setup, then try again."
        @retry="categories.refetch()"
      >
        <CourseForm
          :categories="categories.data.value"
          :pending="create.isPending.value"
          :server-error="create.error.value"
          submit-label="Create course"
          @submit="submit"
        />
      </DataState>
    </AppCard>
  </div>
</template>
