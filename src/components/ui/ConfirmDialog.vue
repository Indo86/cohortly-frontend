<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useId } from 'vue'
import AppButton from './AppButton.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// Accessible confirmation for destructive actions: role="dialog" + aria-modal, labelled and
// described, focus moves into it (on "Cancel", the safe choice), Tab stays inside, Escape
// cancels, and focus returns to whatever opened it.
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  tone: { type: String, default: 'danger' }, // danger | primary
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])

const id = useId()
const panel = ref(null)
const cancelButton = ref(null)
let opener = null

const focusable = () =>
  [...(panel.value?.querySelectorAll('button:not([disabled]), a[href], input, select, textarea') ?? [])]

const onKeydown = (event) => {
  if (event.key === 'Escape' && !props.loading) {
    event.stopPropagation()
    emit('cancel')

    return
  }

  if (event.key !== 'Tab') return

  const items = focusable()

  if (items.length === 0) return

  const first = items[0]
  const last = items[items.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      opener = document.activeElement
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      cancelButton.value?.$el?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown)
      opener?.focus?.()
      opener = null
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`${id}-title`"
      :aria-describedby="`${id}-body`"
      class="max-h-full w-full max-w-md overflow-y-auto rounded-overlay bg-surface p-5 shadow-overlay sm:p-6"
    >
      <!-- every confirmation has the same shape: title, consequence, Cancel, confirm -->
      <h2 :id="`${id}-title`" class="type-section-title">{{ title }}</h2>
      <div :id="`${id}-body`" class="type-body mt-2 space-y-2">
        <slot />
      </div>
      <InlineAlert v-if="error" tone="danger" class="mt-4">{{ error }}</InlineAlert>
      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AppButton ref="cancelButton" variant="secondary" :disabled="loading" @click="emit('cancel')">
          {{ cancelLabel }}
        </AppButton>
        <AppButton :variant="tone === 'danger' ? 'danger' : 'primary'" :loading="loading" @click="emit('confirm')">
          {{ confirmLabel }}
        </AppButton>
      </div>
    </div>
  </div>
</template>
