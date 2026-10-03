<script setup>
import { ref } from 'vue'
import { R } from '@/constants/routes.js'
import { useStudentsQuery } from '@/composables/instructorQueries.js'
import { useDeleteStudent } from '@/composables/instructorMutations.js'
import { normalizeError } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import DataState from '@/components/feedback/DataState.vue'

// Your students (the backend lists only students you created). `courses` is the list of
// courses each one is enrolled in, so its length is the real enrollment count.
const students = useStudentsQuery()
const remove = useDeleteStudent()

const deleting = ref(null)
const error = ref('')

const confirm = async () => {
  error.value = ''

  try {
    await remove.mutateAsync(deleting.value._id)
    deleting.value = null
  } catch (caught) {
    error.value = normalizeError(caught).message
  }
}
</script>

<template>
  <div>
    <PageHeader title="Students" description="Add students and enroll them in your courses.">
      <template #actions>
        <AppButton :to="{ name: R.INSTRUCTOR_STUDENT_NEW }">Add student</AppButton>
      </template>
    </PageHeader>

    <DataState
      :pending="students.isPending.value"
      :error="students.error.value"
      :empty="(students.data.value ?? []).length === 0"
      subject="your students"
      loading-label="Loading your students…"
      empty-title="You have no students yet"
      empty-description="Create a student account, then enroll the student in one of your courses."
      empty-icon="students"
      @retry="students.refetch()"
    >
      <template #empty-actions>
        <AppButton :to="{ name: R.INSTRUCTOR_STUDENT_NEW }">Add your first student</AppButton>
      </template>

      <ul class="flex flex-col gap-3">
        <li v-for="student in students.data.value" :key="student._id" class="card-row flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="flex min-w-0 flex-1 items-center gap-4">
            <UserAvatar :src="student.photo_url" :name="student.name" size="lg" />
            <div class="min-w-0">
              <h2 class="type-card-title truncate">{{ student.name }}</h2>
              <p class="type-meta">
                Enrolled in {{ student.courses.length }} {{ student.courses.length === 1 ? 'course' : 'courses' }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <AppButton
              variant="secondary"
              :to="{ name: R.INSTRUCTOR_STUDENT_EDIT, params: { studentId: student._id } }"
              :aria-label="`Edit ${student.name}`"
            >
              Edit
            </AppButton>
            <AppButton variant="danger-quiet" :aria-label="`Delete ${student.name}`" @click="deleting = student; error = ''">Delete</AppButton>
          </div>
        </li>
      </ul>
    </DataState>

    <ConfirmDialog
      :open="Boolean(deleting)"
      :title="`Delete ${deleting?.name ?? ''}?`"
      confirm-label="Delete student"
      :loading="remove.isPending.value"
      :error="error"
      @confirm="confirm"
      @cancel="deleting = null"
    >
      <p>This permanently deletes the student account. It also removes:</p>
      <ul class="list-disc pl-5">
        <li>the student’s enrollments in all courses,</li>
        <li>all of the student’s learning progress.</li>
      </ul>
    </ConfirmDialog>
  </div>
</template>
