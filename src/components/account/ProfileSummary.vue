<script setup>
import { useAuthStore } from '@/stores/auth.js'
import { formatDateTime } from '@/utils/date.js'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'

// Read-only identity and workspace summary, straight from the session store (/api/me).
defineProps({
  accessLabel: { type: String, default: 'Workspace access' },
})

const auth = useAuthStore()
</script>

<template>
  <AppCard class="max-w-form">
    <dl class="grid gap-5 sm:grid-cols-2">
      <div>
        <dt class="type-eyebrow">Name</dt>
        <dd class="mt-1 text-base text-ink">{{ auth.user?.name }}</dd>
      </div>
      <div>
        <dt class="type-eyebrow">Email</dt>
        <dd class="mt-1 break-all text-base text-ink">{{ auth.user?.email }}</dd>
      </div>
      <div>
        <dt class="type-eyebrow">Role</dt>
        <dd class="mt-1 text-base text-ink">{{ auth.roleLabel }}</dd>
      </div>
      <div>
        <dt class="type-eyebrow">{{ accessLabel }}</dt>
        <dd class="mt-1 text-sm text-ink">
          <StatusBadge v-if="auth.isStudent" kind="workspace" :status="auth.accessStatus" />
          <StatusBadge v-else kind="subscription" :status="auth.accessStatus" />
          <span v-if="auth.accessExpiresAt" class="type-meta ml-2">
            {{ auth.isActive ? 'until' : 'ended' }} {{ formatDateTime(auth.accessExpiresAt) }}
          </span>
        </dd>
      </div>
    </dl>
    <p class="type-help mt-6 border-t border-line pt-4">Account details cannot be changed here yet.</p>
  </AppCard>
</template>
