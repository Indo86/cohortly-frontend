<script setup>
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'

// A real link (<a href>) with aria-current="page" on the active entry; the same state
// drives the highlight (tinted background + stronger text + a marker bar), so "where am I"
// is available to every user and never depends on colour alone.
// Active = the current path is this entry's path or lies below it (/courses/42 keeps
// "Courses" active). `exact` is for entries such as a dashboard whose path is the
// prefix of every other page in the area.
defineProps({
  to: { type: [String, Object], required: true },
  exact: { type: Boolean, default: false },
  icon: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})

const route = useRoute()

const isCurrent = (href, exact) => {
  const path = route.path

  return exact ? path === href : path === href || path.startsWith(`${href}/`)
}
</script>

<template>
  <RouterLink v-slot="{ href, navigate }" :to="to" custom>
    <a
      :href="href"
      :aria-current="isCurrent(href, exact) ? 'page' : undefined"
      class="relative flex min-h-[2.75rem] items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors"
      :class="[isCurrent(href, exact) ? 'bg-shell-800 font-semibold text-shell-ink' : 'text-shell-muted hover:bg-shell-900 hover:text-shell-ink', compact ? 'justify-center px-0' : '']"
      @click="navigate"
    >
      <span v-if="isCurrent(href, exact)" class="absolute -left-1 top-1/2 -mt-1 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
      <AppIcon v-if="icon" :name="icon" class="h-5 w-5 shrink-0" />
      <span :class="compact ? 'sr-only' : ''"><slot /></span>
    </a>
  </RouterLink>
</template>
