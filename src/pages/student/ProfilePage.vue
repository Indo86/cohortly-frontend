<script setup>
import ChangePasswordForm from '@/components/account/ChangePasswordForm.vue'
import ProfileSummary from '@/components/account/ProfileSummary.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
</script>

<template>
  <div>
    <PageHeader title="Profile" description="Your account." />
    <ProfileSummary access-label="Organization workspace" />
    <ChangePasswordForm />
  </div>
</template>
