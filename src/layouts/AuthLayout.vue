<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { APP_TAGLINE } from '@/constants/app.js'
import { R } from '@/constants/routes.js'
import BrandMark from '@/components/ui/BrandMark.vue'
import SkipLink from '@/components/ui/SkipLink.vue'
import ToastRegion from '@/components/feedback/ToastRegion.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col items-center bg-canvas px-4 py-8 text-ink sm:py-12">
    <SkipLink />
    <div class="mb-8 text-center">
      <RouterLink :to="{ name: R.HOME }" class="inline-block rounded-control"><BrandMark size="lg" /></RouterLink>
      <p class="type-meta mt-2">{{ APP_TAGLINE }}</p>
    </div>
    <main id="main" tabindex="-1" class="w-full min-w-0 max-w-md">
      <RouterView />
    </main>
    <ToastRegion />
  </div>
</template>
