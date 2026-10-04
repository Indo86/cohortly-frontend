<script setup>
import { computed } from 'vue'
import { formatDateTime } from '@/utils/date.js'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

// One enrolled learner. EVERYTHING shown here (counts, percent, completed, next lesson, last
// activity) is the backend's answer; nothing is calculated in the browser. A card layout is
// used (instead of a table) so it reads well at 360px.
const props = defineProps({
  learner: { type: Object, required: true },
})

const QUIZ_STATUS = { 'not-started': 'Not started', failed: 'Not passed yet', passed: 'Passed' }

const progress = computed(() => props.learner.progress)

// the state is chosen from the backend's own fields (see constants/status.js for the words)
const state = computed(() => {
  if (progress.value.completed) return 'completed'
  if (progress.value.completedLessons === 0) return 'not-started'

  return 'in-progress'
})

const lastActivity = computed(() => formatDateTime(props.learner.lastActivityAt))
</script>

<template>
  <li class="card-row">
    <div class="flex items-start gap-3">
      <UserAvatar :src="learner.photo_url" :name="learner.name" />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 class="type-card-title truncate">{{ learner.name }}</h3>
          <StatusBadge kind="learning" :status="state" />
        </div>
        <p class="type-help truncate">{{ learner.email }}</p>
      </div>
      <p class="shrink-0 text-right font-display text-3xl font-medium leading-8 tracking-tight text-ink" aria-hidden="true">{{ progress.percent }}%</p>
    </div>

    <div class="mt-3">
      <ProgressBar
        :percent="progress.percent"
        :completed="progress.completed"
        :label="`Progress of ${learner.name}`"
        :text="`${progress.completedLessons} of ${progress.totalLessons} lessons`"
      />
    </div>

    <dl class="mt-4 grid gap-4 text-sm md:grid-cols-2">
      <div>
        <dt class="text-metadata text-ink-3">Next lesson</dt>
        <dd class="mt-1 text-ink">
          <template v-if="learner.nextLesson">
            {{ learner.nextLesson.title }}
            <span v-if="learner.nextLesson.sectionTitle" class="text-ink-muted">· {{ learner.nextLesson.sectionTitle }}</span>
          </template>
          <template v-else-if="progress.completed || (progress.totalLessons > 0 && progress.completedLessons === progress.totalLessons)">All lessons completed</template>
          <template v-else>No lessons yet</template>
        </dd>
      </div>
      <div>
        <dt class="text-metadata text-ink-3">Last activity</dt>
        <dd class="mt-1 text-ink">{{ lastActivity ?? 'No activity yet' }}</dd>
      </div>
      <!-- assessment is reported on its own, never merged into the lesson percentage -->
      <div v-if="learner.quiz">
        <dt class="text-metadata text-ink-3">Final quiz</dt>
        <dd class="mt-1 text-ink">
          {{ QUIZ_STATUS[learner.quiz.status] ?? learner.quiz.status }}
          <span v-if="learner.quiz.attempts > 0" class="text-ink-muted">
            · {{ learner.quiz.attempts }} {{ learner.quiz.attempts === 1 ? 'attempt' : 'attempts' }} · best {{ learner.quiz.bestScore }}%, latest {{ learner.quiz.latestScore }}%
          </span>
        </dd>
      </div>
      <div v-if="'certificateIssued' in learner">
        <dt class="text-metadata text-ink-3">Certificate</dt>
        <dd class="mt-1 text-ink">{{ learner.certificateIssued ? 'Issued' : 'Not issued' }}</dd>
      </div>
    </dl>
  </li>
</template>
