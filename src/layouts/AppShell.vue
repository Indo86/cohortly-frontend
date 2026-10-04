<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ACCESS_LABELS, workspaceLabel } from '@/constants/access.js'
import { R } from '@/constants/routes.js'
import { signInRouteFor } from '@/router/guards.js'
import { useAuthStore } from '@/stores/auth.js'
import { formatDate } from '@/utils/date.js'
import AppIcon from '@/components/ui/AppIcon.vue'
import BrandMark from '@/components/ui/BrandMark.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import SkipLink from '@/components/ui/SkipLink.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import NavItem from '@/components/navigation/NavItem.vue'
import ToastRegion from '@/components/feedback/ToastRegion.vue'

const props = defineProps({
  items: { type: Array, required: true },
  homeTo: { type: [String, Object], required: true },
  areaLabel: { type: String, default: '' },
})
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const open = ref(false)
const expandedRail = ref(false)
const menuButton = ref(null)
const panel = ref(null)
const account = ref(null)
const reader = computed(() => auth.isStudent && route.name === R.STUDENT_LESSON)
const focusMode = computed(() => auth.isStudent && [R.STUDENT_COURSE, R.STUDENT_LESSON, R.STUDENT_QUIZ].includes(route.name))
const compact = computed(() => focusMode.value && !expandedRail.value)
const visibleItems = computed(() => props.items.filter((item) => !item.requiresActive || auth.isActive))
const groups = computed(() => [
  { label: auth.isStudent ? 'Learn' : 'Teach', items: visibleItems.value.filter((item) => !['billing', 'profile'].includes(item.icon)) },
  { label: auth.isStudent ? 'You' : 'Account', items: visibleItems.value.filter((item) => ['billing', 'profile'].includes(item.icon)) },
])
const closeMenu = ({ restoreFocus = false } = {}) => {
  open.value = false
  if (restoreFocus) menuButton.value?.focus()
}
const onKeydown = (event) => {
  if (event.key === 'Escape') {
    if (open.value) closeMenu({ restoreFocus: true })
    else if (account.value?.open) {
      account.value.open = false
      account.value.querySelector('summary')?.focus()
    }
  }
  if (event.key === '[' && focusMode.value && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) {
    expandedRail.value = !expandedRail.value
  }
  if (event.key === 'Tab' && open.value && panel.value) {
    const targets = [...panel.value.querySelectorAll('a[href], button, summary')].filter((element) => !element.disabled && !element.closest('details:not([open]) > div'))
    const first = targets[0]
    const last = targets.at(-1)
    if (event.shiftKey && (document.activeElement === first || !panel.value.contains(document.activeElement))) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
}
let previousOverflow = ''
watch(open, async (isOpen) => {
  if (isOpen) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    panel.value?.querySelector('button')?.focus()
  } else document.body.style.overflow = previousOverflow
})
watch(() => route.fullPath, () => { closeMenu(); if (account.value) account.value.open = false })
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (open.value) document.body.style.overflow = previousOverflow
})
const signOut = async () => {
  const target = signInRouteFor(auth.role)
  auth.logout()
  await router.replace({ name: target })
}
</script>

<template>
  <div class="min-h-screen bg-paper text-ink lg:grid print:block print:min-h-0 print:bg-white" :class="[compact ? 'lg:grid-cols-focus' : 'lg:grid-cols-shell']">
    <SkipLink />
    <header class="shell-surface sticky top-0 z-30 flex h-header items-center justify-between bg-shell-950 px-4 text-shell-ink lg:hidden print:hidden">
      <RouterLink :to="homeTo" class="rounded-sm"><BrandMark /></RouterLink>
      <button ref="menuButton" type="button" class="inline-flex min-h-11 items-center gap-2 rounded-sm px-3 text-sm text-shell-ink hover:bg-shell-900" aria-controls="primary-navigation" :aria-expanded="open ? 'true' : 'false'" @click="open = !open">
        <AppIcon :name="open ? 'close' : 'menu'" />Menu
      </button>
    </header>
    <button v-if="open" type="button" class="fixed inset-0 z-40 bg-shell-950/60 lg:hidden print:hidden" tabindex="-1" aria-label="Close navigation" @click="closeMenu({ restoreFocus: true })" />
    <aside id="primary-navigation" ref="panel" class="shell-surface z-50 flex-col gap-6 bg-shell-950 text-shell-ink print:!hidden lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:overflow-y-auto" :class="[open ? 'fixed inset-y-0 left-0 flex w-sidebar overflow-y-auto p-4 lg:relative lg:w-auto' : 'hidden lg:flex', compact ? 'lg:px-3 lg:py-6' : 'lg:p-4 lg:py-6']" :role="open ? 'dialog' : undefined" :aria-modal="open ? 'true' : undefined" :aria-label="open ? 'Main navigation' : undefined">
      <button v-if="open" type="button" class="flex min-h-11 items-center gap-2 rounded-sm px-2 lg:hidden" @click="closeMenu({ restoreFocus: true })"><AppIcon name="close" />Close menu</button>
      <div class="px-2" :class="compact && !open ? 'hidden lg:block lg:px-0 lg:text-center' : ''">
        <RouterLink :to="homeTo" class="inline-flex min-h-11 items-center rounded-sm"><BrandMark :compact="compact && !open" /></RouterLink>
      </div>
      <button v-if="focusMode" type="button" class="hidden min-h-11 items-center justify-center rounded-sm text-shell-muted hover:bg-shell-900 hover:text-shell-ink lg:flex" :aria-label="compact ? 'Expand navigation' : 'Collapse navigation'" :title="compact ? 'Expand navigation [ ' : 'Collapse navigation [ '" @click="expandedRail = !expandedRail">
        <AppIcon name="menu" /><span v-if="!compact" class="ml-3 text-sm">Collapse navigation</span>
      </button>
      <div v-if="!compact || open" class="flex items-center gap-3 rounded-sm bg-shell-900 p-3">
        <UserAvatar :name="auth.user?.name ?? ''" size="sm" />
        <div class="min-w-0">
          <p class="text-sm font-semibold">{{ areaLabel }}</p>
          <p class="mt-1 text-metadata text-shell-muted">{{ auth.isStudent ? 'Workspace ' + workspaceLabel(auth.accessStatus).toLowerCase() : ACCESS_LABELS[auth.accessStatus] }}</p>
          <p v-if="auth.isInstructor && auth.isActive && auth.accessExpiresAt" class="mt-1 text-metadata text-shell-muted">Until {{ formatDate(auth.accessExpiresAt) }}</p>
        </div>
      </div>
      <nav aria-label="Main" class="flex flex-col gap-6">
        <div v-for="group in groups" :key="group.label" class="space-y-1">
          <p v-if="group.items.length" class="mb-2 px-3 font-mono text-xs uppercase tracking-widest text-shell-muted" :class="compact && !open ? 'sr-only' : ''">{{ group.label }}</p>
          <NavItem v-for="item in group.items" :key="item.label" :to="item.to" :exact="item.exact" :icon="item.icon" :compact="compact && !open" :title="item.label">{{ item.label }}</NavItem>
        </div>
      </nav>
      <details ref="account" class="account-menu relative mt-auto border-t border-shell-800 pt-4">
        <summary class="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-sm py-2 text-shell-ink" :class="compact && !open ? 'justify-center' : 'px-1'" :aria-label="auth.user?.name + ', account menu'">
          <UserAvatar :name="auth.user?.name ?? ''" size="sm" />
          <span class="min-w-0" :class="compact && !open ? 'sr-only' : ''"><span class="block truncate text-sm font-semibold">{{ auth.user?.name }}</span><span class="mt-1 block font-mono text-xs uppercase tracking-wide text-shell-muted">{{ auth.roleLabel }}</span></span>
        </summary>
        <div class="flex flex-col gap-1 border-t border-shell-800 pt-2">
          <button type="button" class="flex min-h-11 items-center rounded-sm px-2 text-left text-sm hover:bg-shell-900" @click="signOut"><AppIcon v-if="compact && !open" name="arrow-left" /><span :class="compact && !open ? 'sr-only' : ''">Sign out</span></button>
        </div>
      </details>
    </aside>
    <main id="main" tabindex="-1" :inert="open || undefined" class="min-w-0 px-4 py-8 md:px-6 xl:px-8 xl:py-12 print:p-0" :class="reader ? 'reader-main' : ''">
      <PageContainer><slot /></PageContainer>
    </main>
    <ToastRegion />
  </div>
</template>
