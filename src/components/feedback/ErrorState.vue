<script setup>
import { computed } from 'vue'
import { ErrorKind } from '@/services/apiError.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

// Recoverable error panel for a page or section. Pass the ApiError (or just a message) and,
// where known, `subject` ("your courses"): the heading then says WHAT could not be loaded and
// the guidance says what the user can do. Backend internals are never shown beyond the
// message the backend chose to send. Network and server problems get a retry button; the
// session is never touched here.
const props = defineProps({
  error: { type: Object, default: null },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  subject: { type: String, default: '' },
  retryLabel: { type: String, default: 'Try again' },
  // a page-level state is the page's <h1>; inside a page it is an <h2>
  level: { type: Number, default: 2 },
})

const emit = defineEmits(['retry'])

const heading = computed(() => {
  if (props.title) return props.title

  const kind = props.error?.kind
  const what = props.subject

  if (kind === ErrorKind.NETWORK) return 'Cannot reach the server'
  if (kind === ErrorKind.SERVER) return what ? `We could not load ${what}` : 'The server had a problem'
  if (kind === ErrorKind.FORBIDDEN) return 'You do not have access to this'
  if (kind === ErrorKind.ENTITLEMENT) return 'This workspace is not active'
  if (kind === ErrorKind.NOT_FOUND) return 'Not found'

  return what ? `We could not load ${what}` : 'Something went wrong'
})

const GUIDANCE = {
  [ErrorKind.SERVER]: 'The server had a problem. This is on our side, so try again in a moment.',
  [ErrorKind.FORBIDDEN]: 'If you think this is a mistake, contact your instructor or organization.',
}

const text = computed(() => props.message || props.error?.message || 'Please try again.')
// what the user can do next, when the backend message alone does not say
const hint = computed(() => (props.message ? '' : GUIDANCE[props.error?.kind] ?? ''))
const retryable = computed(() => [ErrorKind.NETWORK, ErrorKind.SERVER, ErrorKind.UNKNOWN, undefined].includes(props.error?.kind))
</script>

<template>
  <div class="flex flex-col items-center gap-2 rounded-card border border-danger/30 bg-danger-soft/50 px-4 py-10 text-center" role="alert">
    <AppIcon name="warning" class="h-8 w-8 text-danger" />
    <component :is="`h${level}`" class="type-card-title text-danger-strong">{{ heading }}</component>
    <p class="max-w-md text-sm leading-6 text-danger-strong">{{ text }}</p>
    <p v-if="hint" class="max-w-md text-sm leading-6 text-danger-strong">{{ hint }}</p>
    <div class="mt-3 flex flex-wrap justify-center gap-2">
      <AppButton v-if="retryable" variant="secondary" @click="emit('retry')">{{ retryLabel }}</AppButton>
      <slot />
    </div>
  </div>
</template>
