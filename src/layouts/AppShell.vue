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
// Primary entries fill the top of the sidebar; billing sits at the bottom of the navigation and
// Profile lives in the account menu next to Sign out, so neither is listed twice.
const primaryItems = computed(() => visibleItems.value.filter((item) => !['billing', 'profile'].includes(item.icon)))
const billingItem = computed(() => visibleItems.value.find((item) => item.icon === 'billing'))
const profileItem = computed(() => visibleItems.value.find((item) => item.icon === 'profile'))
const profileCurrent = computed(() => !!profileItem.value && route.name === profileItem.value.to.name)
const workspaceStatus = computed(() => auth.isStudent
  ? 'Workspace ' + workspaceLabel(auth.accessStatus).toLowerCase()
  : [ACCESS_LABELS[auth.accessStatus], auth.isActive && auth.accessExpiresAt ? 'until ' + formatDate(auth.accessExpiresAt, 'medium') : ''].filter(Boolean).join(' · '))
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
const onPointerDown = (event) => {
  if (account.value?.open && !account.value.contains(event.target)) account.value.open = false
}
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('pointerdown', onPointerDown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onPointerDown)
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
    <aside id="primary-navigation" ref="panel" class="shell-surface z-50 flex-col gap-4 bg-shell-950 text-shell-ink print:!hidden lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:overflow-y-auto" :class="[open ? 'fixed inset-y-0 left-0 flex w-sidebar overflow-y-auto p-4 lg:relative lg:w-auto' : 'hidden lg:flex', compact ? 'lg:px-3 lg:py-6' : 'lg:p-4 lg:py-6']" :role="open ? 'dialog' : undefined" :aria-modal="open ? 'true' : undefined" :aria-label="open ? 'Main navigation' : undefined">
      <button v-if="open" type="button" class="flex min-h-11 items-center gap-2 rounded-sm px-2 lg:hidden" @click="closeMenu({ restoreFocus: true })"><AppIcon name="close" />Close menu</button>
      <div class="px-2" :class="compact && !open ? 'hidden lg:block lg:px-0 lg:text-center' : ''">
        <RouterLink :to="homeTo" class="inline-flex min-h-11 items-center rounded-sm"><BrandMark :compact="compact && !open" /></RouterLink>
      </div>
      <button v-if="focusMode" type="button" class="hidden min-h-11 items-center justify-center rounded-sm text-shell-muted hover:bg-shell-900 hover:text-shell-ink lg:flex" :aria-label="compact ? 'Expand navigation' : 'Collapse navigation'" :title="compact ? 'Expand navigation [ ' : 'Collapse navigation [ '" @click="expandedRail = !expandedRail">
        <AppIcon name="menu" /><span v-if="!compact" class="ml-3 text-sm">Collapse navigation</span>
      </button>
      <div v-if="!compact || open" class="rounded-control bg-shell-900 px-3 py-2.5">
        <p class="truncate text-sm font-semibold">{{ areaLabel }}</p>
        <p class="mt-0.5 flex items-center gap-2 text-metadata text-shell-muted">
          <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="auth.isActive ? 'bg-accent' : 'bg-shell-muted'" aria-hidden="true" />
          <span class="min-w-0">{{ workspaceStatus }}</span>
        </p>
      </div>
      <nav aria-label="Main" class="flex flex-1 flex-col gap-4">
        <div class="space-y-1">
          <NavItem v-for="item in primaryItems" :key="item.label" :to="item.to" :exact="item.exact" :icon="item.icon" :compact="compact && !open" :title="item.label">{{ item.label }}</NavItem>
        </div>
        <div v-if="billingItem" class="mt-auto">
          <NavItem :to="billingItem.to" :exact="billingItem.exact" :icon="billingItem.icon" :compact="compact && !open" :title="billingItem.label">{{ billingItem.label }}</NavItem>
        </div>
      </nav>
      <details ref="account" class="account-menu relative border-t border-shell-800 pt-3">
        <summary class="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-control py-2 hover:bg-shell-900" :class="[compact && !open ? 'justify-center' : 'px-3', profileCurrent ? 'bg-shell-800' : '']" :aria-label="auth.user?.name + ', account menu'">
          <UserAvatar :src="auth.user?.photoUrl ?? ''" :name="auth.user?.name ?? ''" size="sm" />
          <span class="min-w-0 flex-1" :class="compact && !open ? 'sr-only' : ''"><span class="block truncate text-sm font-semibold">{{ auth.user?.name }}</span><span class="block font-mono text-xs uppercase tracking-wide text-shell-muted">{{ auth.roleLabel }}</span></span>
          <AppIcon v-if="!compact || open" name="chevron-up" class="account-chevron h-4 w-4 shrink-0 text-shell-muted" />
        </summary>
        <div class="mt-1 flex flex-col gap-1">
          <NavItem v-if="profileItem" :to="profileItem.to" :icon="profileItem.icon" :compact="compact && !open" :title="profileItem.label">{{ profileItem.label }}</NavItem>
          <button type="button" class="flex min-h-[2.75rem] items-center gap-3 rounded-control px-3 text-left text-sm font-medium text-shell-muted hover:bg-shell-900 hover:text-shell-ink" :class="compact && !open ? 'justify-center px-0' : ''" title="Sign out" @click="signOut"><AppIcon name="arrow-left" class="h-5 w-5 shrink-0" /><span :class="compact && !open ? 'sr-only' : ''">Sign out</span></button>
        </div>
      </details>
    </aside>
    <main id="main" tabindex="-1" :inert="open || undefined" class="min-w-0 px-4 py-8 md:px-6 xl:px-8 xl:py-12 print:p-0" :class="reader ? 'reader-main' : ''">
      <PageContainer><slot /></PageContainer>
    </main>
    <ToastRegion />
  </div>
</template>
