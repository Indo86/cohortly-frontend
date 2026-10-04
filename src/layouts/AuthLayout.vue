<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { APP_TAGLINE } from '@/constants/app.js'
import { R } from '@/constants/routes.js'
import BrandMark from '@/components/ui/BrandMark.vue'
import AuthField from '@/components/ui/AuthField.vue'
import SkipLink from '@/components/ui/SkipLink.vue'
import ToastRegion from '@/components/feedback/ToastRegion.vue'
const route = useRoute()
const publicCertificate = computed(() => [R.CERTIFICATE_VERIFY, R.CERTIFICATE_LOOKUP].includes(route.name))
const studentPortal = computed(() => route.name === R.STUDENT_SIGN_IN)
</script>

<template>
  <div class="min-h-screen bg-paper text-ink" :class="publicCertificate ? '' : 'lg:grid lg:grid-cols-[42%_58%]'">
    <SkipLink />
    <div v-if="!publicCertificate" class="shell-surface relative isolate flex min-h-40 flex-col overflow-hidden bg-shell-950 px-4 py-6 text-shell-ink md:min-h-60 md:px-12 lg:min-h-screen lg:py-12">
      <AuthField />
      <RouterLink :to="{ name: R.HOME }" class="relative inline-block w-fit rounded-sm"><BrandMark /></RouterLink>
      <div class="relative my-auto max-w-lg py-6 md:py-8 lg:py-24">
        <p class="max-w-[14ch] font-display text-3xl font-medium leading-tight tracking-tight md:max-w-none md:text-4xl lg:max-w-[12ch] lg:text-display">{{ studentPortal ? 'Pick up where you left off.' : APP_TAGLINE }}</p>
        <p class="mt-6 hidden max-w-xs text-body text-shell-muted lg:block">{{ studentPortal ? 'A clear path through every course. One lesson at a time.' : 'Build courses, enroll your team, track every lesson.' }}</p>
      </div>
      <p class="relative hidden font-mono text-xs uppercase tracking-widest text-shell-muted lg:block">{{ studentPortal ? 'Your learning space' : 'Instructor workspace' }}</p>
    </div>
    <header v-else class="shell-surface bg-shell-950 px-4 py-6 text-shell-ink md:px-8"><RouterLink :to="{ name: R.HOME }" class="inline-flex rounded-sm"><BrandMark /></RouterLink></header>
    <main id="main" tabindex="-1" class="flex min-w-0 items-center justify-center px-4 py-12 md:px-12">
      <div class="min-w-0 w-full" :class="publicCertificate && route.name === R.CERTIFICATE_VERIFY ? 'max-w-6xl' : 'max-w-[25rem]'"><RouterView /></div>
    </main>
    <ToastRegion />
  </div>
</template>
