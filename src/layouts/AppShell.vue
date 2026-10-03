<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ACCESS_LABELS, ACCESS_TONES, workspaceLabel, workspaceTone } from '@/constants/access.js'
import { signInRouteFor } from '@/router/guards.js'
import { useAuthStore } from '@/stores/auth.js'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BrandMark from '@/components/ui/BrandMark.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import SkipLink from '@/components/ui/SkipLink.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import NavItem from '@/components/navigation/NavItem.vue'
import ToastRegion from '@/components/feedback/ToastRegion.vue'

// Responsive application shell shared by the instructor and student layouts.
//  - lg and up: a sticky sidebar column (16rem token) next to the content (a grid, never a
//    fixed offset)
//  - below lg: a top bar (3.5rem token) with a menu button that expands the same navigation
//    in place
// The menu button is a real <button> with aria-expanded / aria-controls; Escape closes it
// and returns focus to the button; it also closes after navigating.
// The page content sits in a PageContainer (max 72rem), so wide screens keep a readable column.
const props = defineProps({
  items: { type: Array, required: true },
  homeTo: { type: [String, Object], required: true },
  areaLabel: { type: String, default: '' }, // e.g. "Instructor workspace"
})

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const open = ref(false)
const menuButton = ref(null)

// hide entries that need an active workspace while it is not active
const visibleItems = computed(() => props.items.filter((item) => !item.requiresActive || auth.isActive))

const closeMenu = ({ restoreFocus = false } = {}) => {
  open.value = false

  if (restoreFocus) menuButton.value?.focus()
}

const onKeydown = (event) => {
  if (event.key === 'Escape' && open.value) closeMenu({ restoreFocus: true })
}

watch(open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})
watch(() => route.fullPath, () => closeMenu())
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const signOut = async () => {
  const target = signInRouteFor(auth.role)

  auth.logout()
  await router.replace({ name: target })
}
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-shell print:block print:min-h-0 print:bg-white">
    <SkipLink />

    <header class="sticky top-0 z-30 flex h-header items-center justify-between border-b border-line bg-surface px-4 lg:hidden print:hidden">
      <RouterLink :to="homeTo" class="rounded-control"><BrandMark /></RouterLink>
      <button
        ref="menuButton"
        type="button"
        class="inline-flex min-h-[2.75rem] items-center gap-2 rounded-control px-3 text-sm font-medium text-ink-soft hover:bg-surface-muted"
        aria-controls="primary-navigation"
        :aria-expanded="open ? 'true' : 'false'"
        @click="open = !open"
      >
        <AppIcon :name="open ? 'close' : 'menu'" />
        Menu
      </button>
    </header>

    <aside
      id="primary-navigation"
      class="flex-col gap-6 border-b border-line bg-surface p-4 print:!hidden lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-4 lg:py-6"
      :class="open ? 'flex' : 'hidden lg:flex'"
    >
      <div class="hidden px-2 lg:block">
        <RouterLink :to="homeTo" class="inline-block rounded-control"><BrandMark /></RouterLink>
        <p v-if="areaLabel" class="type-eyebrow mt-2">{{ areaLabel }}</p>
      </div>

      <nav aria-label="Main" class="flex flex-col gap-1">
        <NavItem v-for="item in visibleItems" :key="item.label" :to="item.to" :exact="item.exact" :icon="item.icon">{{ item.label }}</NavItem>
      </nav>

      <div class="mt-auto flex flex-col gap-3 border-t border-line pt-4">
        <div class="flex min-w-0 items-center gap-3 px-1">
          <UserAvatar :name="auth.user?.name ?? ''" />
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-ink">{{ auth.user?.name }}</p>
            <p class="truncate type-help">{{ auth.user?.email }}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 px-1">
          <AppBadge tone="info">{{ auth.roleLabel }}</AppBadge>
          <AppBadge v-if="auth.isStudent" :tone="workspaceTone(auth.accessStatus)">
            Workspace {{ workspaceLabel(auth.accessStatus).toLowerCase() }}
          </AppBadge>
          <AppBadge v-else :tone="ACCESS_TONES[auth.accessStatus]">{{ ACCESS_LABELS[auth.accessStatus] }}</AppBadge>
        </div>
        <AppButton variant="secondary" block @click="signOut">Sign out</AppButton>
      </div>
    </aside>

    <main id="main" tabindex="-1" class="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 print:p-0">
      <PageContainer>
        <slot />
      </PageContainer>
    </main>

    <ToastRegion />
  </div>
</template>
