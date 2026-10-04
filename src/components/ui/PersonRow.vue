<script setup>
import UserAvatar from './UserAvatar.vue'
defineProps({
  person: { type: Object, required: true },
  heading: { type: String, default: 'h2' },
})
</script>
<template>
  <li class="card-row flex min-w-0 flex-wrap items-center gap-3 py-3">
    <UserAvatar :name="person.name" :src="person.photo_url ?? ''" />
    <div class="min-w-0 flex-1 basis-32">
      <component :is="heading" class="break-words text-body font-semibold text-ink">{{ person.name }}</component>
      <p v-if="person.email" class="type-meta break-all">{{ person.email }}</p>
      <div class="type-meta mt-1"><slot name="summary" /></div>
    </div>
    <div v-if="$slots.default" class="flex flex-wrap items-center gap-2"><slot /></div>
  </li>
</template>
