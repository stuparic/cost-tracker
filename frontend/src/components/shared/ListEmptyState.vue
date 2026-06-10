<template>
  <div class="empty-state">
    <i class="pi pi-inbox"></i>
    <p>{{ message }}</p>
    <router-link :to="ctaTo">
      <Button :label="ctaLabel" icon="pi pi-plus" size="small" :class="buttonClass" />
    </router-link>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';

defineProps<{
  message: string;
  ctaTo: string;
  ctaLabel: string;
  buttonClass?: string;
}>();
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  color: var(--text-secondary);
}

.empty-state i {
  font-size: 2.5rem;
  color: var(--surface-border);
}

.empty-state p {
  margin: 0;
}
</style>
