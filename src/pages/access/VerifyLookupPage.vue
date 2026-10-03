<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { R } from '@/constants/routes.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'

// Public entry to certificate verification for someone who only has the printed ID.
const router = useRouter()
const number = ref('')
const error = ref('')

const lookup = async () => {
  const value = number.value.trim().toUpperCase()

  error.value = value ? '' : 'Enter the certificate ID printed on the certificate.'

  if (value) await router.push({ name: R.CERTIFICATE_VERIFY, params: { certificateNumber: value } })
}
</script>

<template>
  <AppCard>
    <h1 class="type-page-title">Verify a certificate</h1>
    <p class="type-body mt-2">Enter the certificate ID to check that it was issued through Cohortly.</p>

    <form class="mt-6 flex flex-col gap-4" novalidate @submit.prevent="lookup">
      <AppInput v-model="number" label="Certificate ID" required hint="For example COH-2026-ABCD2345" autocomplete="off" :error="error" />
      <AppButton type="submit" block>Verify</AppButton>
    </form>
  </AppCard>
</template>
