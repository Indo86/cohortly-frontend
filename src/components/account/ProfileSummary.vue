<script setup>
import { useAuthStore } from '@/stores/auth.js'
import { formatDateTime } from '@/utils/date.js'
import AvatarForm from '@/components/account/AvatarForm.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

// Read-only identity and workspace summary, straight from the session store (/api/me).
defineProps({
  accessLabel: { type: String, default: 'Workspace access' },
})

const auth = useAuthStore()
</script>

<template>
  <section class="max-w-3xl border-t border-line py-8">
    <div class="mb-8 flex items-center gap-4"><UserAvatar :src="auth.user?.photoUrl ?? ''" :name="auth.user?.name ?? ''" size="lg" /><div><h2 class="type-section-title">{{ auth.user?.name }}</h2><p class="type-meta mt-1">{{ auth.roleLabel }}</p></div></div>
    <AvatarForm />
    <dl class="account-ledger divide-y divide-line border-y border-line">
      <div class="grid gap-2 py-4 sm:grid-cols-[10rem_1fr]">
        <dt class="text-sm text-ink-2">Name</dt>
        <dd class="mt-1 text-base text-ink">{{ auth.user?.name }}</dd>
      </div>
      <div class="grid gap-2 py-4 sm:grid-cols-[10rem_1fr]">
        <dt class="text-sm text-ink-2">Email</dt>
        <dd class="mt-1 break-all text-base text-ink">{{ auth.user?.email }}</dd>
      </div>
      <div class="grid gap-2 py-4 sm:grid-cols-[10rem_1fr]">
        <dt class="text-sm text-ink-2">Role</dt>
        <dd class="mt-1 text-base text-ink">{{ auth.roleLabel }}</dd>
      </div>
      <div class="grid gap-2 py-4 sm:grid-cols-[10rem_1fr]">
        <dt class="text-sm text-ink-2">{{ accessLabel }}</dt>
        <dd class="mt-1 text-sm text-ink">
          <StatusBadge v-if="auth.isStudent" kind="workspace" :status="auth.accessStatus" />
          <StatusBadge v-else kind="subscription" :status="auth.accessStatus" />
          <span v-if="auth.accessExpiresAt" class="type-meta ml-2">
            {{ auth.isActive ? 'until' : 'ended' }} {{ formatDateTime(auth.accessExpiresAt) }}
          </span>
        </dd>
      </div>
    </dl>
    <p class="type-help mt-6 border-t border-line pt-4">Your name and email cannot be changed here yet.</p>
  </section>
</template>
