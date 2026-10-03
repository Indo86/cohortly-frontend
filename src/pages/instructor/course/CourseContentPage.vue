<script setup>
import { computed, ref } from 'vue'
import { useCourseQuery } from '@/composables/instructorQueries.js'
import { useCreateSection, useReorderSections } from '@/composables/instructorMutations.js'
import { useRouteParam } from '@/composables/useRouteParam.js'
import { fieldErrors, normalizeError } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'
import SectionCard from '@/components/instructor/SectionCard.vue'

// Content tab: the ordered sections and lessons of the course, straight from the backend.
// Reordering sends the COMPLETE id list; if the server answers REORDER_MISMATCH the current
// structure is reloaded (never overwritten) and the instructor is told.
const courseId = useRouteParam('courseId')
const course = useCourseQuery(courseId)
const create = useCreateSection(courseId)
const reorder = useReorderSections(courseId)

const sections = computed(() => course.data.value?.sections ?? [])
const newTitle = ref('')
const titleError = ref('')
const reorderMessage = ref('')

const addSection = async () => {
  titleError.value = ''

  if (newTitle.value.trim().length < 3) {
    titleError.value = 'Enter a title of at least 3 characters.'

    return
  }

  try {
    await create.mutateAsync(newTitle.value.trim())
    newTitle.value = ''
  } catch (caught) {
    const error = normalizeError(caught)

    titleError.value = fieldErrors(error).title ?? error.message
  }
}

const moveSection = async (index, delta) => {
  const ids = sections.value.map((section) => section._id)
  const target = index + delta

  if (target < 0 || target >= ids.length) return

  ;[ids[index], ids[target]] = [ids[target], ids[index]]
  reorderMessage.value = ''

  try {
    await reorder.mutateAsync(ids)
  } catch (caught) {
    const error = normalizeError(caught)

    reorderMessage.value =
      error.code === 'REORDER_MISMATCH'
        ? 'The sections changed elsewhere, so the current order was reloaded. Please try again.'
        : error.message
  }
}
</script>

<template>
  <div v-if="course.data.value" class="flex flex-col gap-6">
    <InlineAlert v-if="reorderMessage" tone="warning">{{ reorderMessage }}</InlineAlert>

    <EmptyState
      v-if="sections.length === 0"
      title="Start with a section"
      description="Sections group your lessons. Add your first section below, then add lessons to it. A course needs at least one lesson before it can be published."
      icon="courses"
    />

    <ol v-else class="flex flex-col gap-6">
      <SectionCard
        v-for="(section, index) in sections"
        :key="section._id"
        :course-id="courseId"
        :section="section"
        :index="index"
        :total="sections.length"
        :busy="reorder.isPending.value"
        @move="(delta) => moveSection(index, delta)"
      />
    </ol>

    <AppCard>
      <form class="flex flex-col gap-3 sm:flex-row sm:items-end" novalidate @submit.prevent="addSection">
        <div class="flex-1">
          <AppInput v-model="newTitle" label="New section title" required :error="titleError" hint="Sections group related lessons, for example “Getting started”." />
        </div>
        <AppButton type="submit" :loading="create.isPending.value">Add section</AppButton>
      </form>
    </AppCard>
  </div>
</template>
