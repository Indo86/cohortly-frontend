<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppSpinner from './AppSpinner.vue'

// The one button. Four everyday variants plus one for destructive confirmation:
//   primary      the main action of a view (one per area)
//   secondary    any other action
//   ghost        low-emphasis action (cancel, back)
//   danger       solid red: ONLY the confirm button of a destructive dialog
//   danger-quiet text-only red: the trigger of a destructive action next to other actions (Delete, Remove)
//   danger-outline red outline: the trigger of a destructive action that stands alone (delete course)
// All share one height (44px tap target), padding, radius, focus ring, disabled and loading look.
const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | ghost | danger | danger-quiet | danger-outline
  type: { type: String, default: 'button' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  // when set the component renders a router link instead of a button
  to: { type: [String, Object], default: null },
})

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'border border-line-strong bg-surface-raised text-ink hover:bg-paper-sunk',
  ghost: 'text-ink-soft hover:bg-surface-muted',
  danger: 'bg-danger text-white hover:bg-danger-strong',
  'danger-quiet': 'text-danger hover:bg-danger-soft',
  'danger-outline': 'border border-danger/50 bg-surface text-danger hover:bg-danger-soft',
}

const classes = computed(() => [
  'inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-control px-4 py-2 text-body font-semibold leading-5',
  'transition-colors duration-150 disabled:pointer-events-none disabled:!border-transparent disabled:!bg-paper-sunk disabled:!text-ink-3',
  VARIANTS[props.variant] ?? VARIANTS.primary,
  props.block ? 'w-full' : '',
])
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="classes">
    <slot />
  </RouterLink>
  <button
    v-else
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
  >
    <AppSpinner v-if="loading" size="sm" />
    <slot />
  </button>
</template>
