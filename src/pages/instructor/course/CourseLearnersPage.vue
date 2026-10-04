<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import { useCourseQuery, useCourseStudentsQuery, useStudentsQuery } from '@/composables/instructorQueries.js'
import { useEnrollStudent, useUnenrollStudent } from '@/composables/instructorMutations.js'
import { useRouteParam } from '@/composables/useRouteParam.js'
import { normalizeError } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import PersonRow from '@/components/ui/PersonRow.vue'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import DataState from '@/components/feedback/DataState.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// Learners tab: who is enrolled in this course, enroll one of your students, or remove one.
// The select only offers students who are NOT enrolled yet, so duplicates cannot be created
// from here (the backend is idempotent as well).
const courseId = useRouteParam('courseId')
const course = useCourseQuery(courseId)
const enrolled = useCourseStudentsQuery(courseId)
const students = useStudentsQuery()
const enroll = useEnrollStudent(courseId)
const unenroll = useUnenrollStudent(courseId)

const selected = ref('')
const enrollError = ref('')
const removing = ref(null) // the learner being removed
const removeError = ref('')

const learners = computed(() => enrolled.data.value?.students ?? [])
const available = computed(() => {
  const taken = new Set(learners.value.map((learner) => learner._id))

  return (students.data.value ?? []).filter((student) => !taken.has(student._id))
})
const options = computed(() => available.value.map((student) => ({ value: student._id, label: student.name })))
const noStudentsAtAll = computed(() => students.data.value && students.data.value.length === 0)

const add = async () => {
  enrollError.value = ''

  if (!selected.value) {
    enrollError.value = 'Choose a student to enroll.'

    return
  }

  try {
    await enroll.mutateAsync(selected.value)
    selected.value = ''
  } catch (caught) {
    enrollError.value = normalizeError(caught).message
  }
}

const confirmRemove = async () => {
  removeError.value = ''

  try {
    await unenroll.mutateAsync(removing.value._id)
    removing.value = null
  } catch (caught) {
    removeError.value = normalizeError(caught).message
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <InlineAlert v-if="course.data.value?.status === 'draft'" tone="info">
      Students can only see this course once it is published. You can enroll them now.
    </InlineAlert>

    <!-- 1. who is enrolled now -->
    <section>
      <SectionHeader :title="`Enrolled learners (${learners.length})`" />
      <DataState
        :pending="enrolled.isPending.value"
        :error="enrolled.error.value"
        :empty="learners.length === 0"
        subject="the learners"
        loading-label="Loading learners…"
        empty-title="No learners enrolled yet"
        empty-description="Enroll one of your students below to let them follow this course."
        empty-icon="students"
        @retry="enrolled.refetch()"
      >
        <ul class="divide-y divide-line">
          <PersonRow v-for="learner in learners" :key="learner._id" :person="learner" heading="h3">
            <ActionMenu :label="'More actions for ' + learner.name">
            <AppButton variant="danger-quiet" :aria-label="`Remove ${learner.name} from this course`" @click="removing = learner; removeError = ''">
              Remove
            </AppButton>
            </ActionMenu>
          </PersonRow>
        </ul>
      </DataState>
    </section>

    <!-- 2. add one -->
    <AppCard>
      <SectionHeader title="Enroll a student" />

      <DataState
        :pending="students.isPending.value"
        :error="students.error.value"
        subject="your students"
        loading-label="Loading your students…"
        @retry="students.refetch()"
      >
        <p v-if="noStudentsAtAll" class="type-body">
          You have no students yet.
          <RouterLink :to="{ name: R.INSTRUCTOR_STUDENT_NEW }" class="type-link">Add a student</RouterLink>
          first, then enroll them here.
        </p>
        <p v-else-if="available.length === 0" class="type-body">
          All of your students are already enrolled in this course.
        </p>
        <form v-else class="flex flex-col gap-3 sm:flex-row sm:items-end" novalidate @submit.prevent="add">
          <div class="flex-1">
            <AppSelect v-model="selected" label="Student" :options="options" placeholder="Choose a student…" :error="enrollError" />
          </div>
          <AppButton type="submit" :loading="enroll.isPending.value">Enroll</AppButton>
        </form>
      </DataState>
    </AppCard>

    <ConfirmDialog
      :open="Boolean(removing)"
      :title="`Remove ${removing?.name ?? ''} from this course?`"
      confirm-label="Remove from course"
      :loading="unenroll.isPending.value"
      :error="removeError"
      @confirm="confirmRemove"
      @cancel="removing = null"
    >
      <p class="font-semibold text-danger-strong">{{ removing?.name }}’s progress in this course will be deleted.</p>
      <p>If you enroll them again later, they start from zero.</p>
    </ConfirmDialog>
  </div>
</template>
