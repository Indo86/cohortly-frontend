<script setup>
import { computed, ref } from 'vue'
import { useAsyncAction } from '@/composables/useAsyncAction.js'
import { notify } from '@/composables/useToast.js'
import { fieldErrors } from '@/services/apiError.js'
import * as authService from '@/services/authService.js'
import { useAuthStore } from '@/stores/auth.js'
import AppButton from '@/components/ui/AppButton.vue'
import ImageField from '@/components/ui/ImageField.vue'
import InlineAlert from '@/components/feedback/InlineAlert.vue'

// The signed-in user's own profile photo (PUT /api/me/avatar), for instructors and students alike.
// The store is updated from the response, so the sidebar and the profile show it at once.
const auth = useAuthStore()

const file = ref(null)

const { pending, error, run } = useAsyncAction(() => authService.updateAvatar(file.value))

const fieldMessage = computed(() => fieldErrors(error.value).avatar ?? '')
const generalMessage = computed(() => (error.value && !fieldMessage.value ? error.value.message : ''))

const submit = async () => {
  if (!file.value) return

  const result = await run()

  if (!result.ok) return

  auth.setPhotoUrl(result.data.photo_url)
  file.value = null
  notify('Profile photo updated.')
}
</script>

<template>
  <form class="mb-8 flex flex-col gap-4" novalidate @submit.prevent="submit">
    <InlineAlert v-if="generalMessage" tone="danger">{{ generalMessage }}</InlineAlert>

    <ImageField
      v-model="file"
      label="Profile photo"
      :current-url="auth.user?.photoUrl ?? ''"
      preview-alt="New profile photo preview"
      :error="fieldMessage"
    />

    <div v-if="file" class="flex justify-end">
      <AppButton type="submit" :loading="pending">Save photo</AppButton>
    </div>
  </form>
</template>
