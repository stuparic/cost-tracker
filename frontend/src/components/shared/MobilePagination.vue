<template>
  <div v-if="totalPages > 1" class="mobile-pagination">
    <Button
      icon="pi pi-chevron-left"
      text
      rounded
      :disabled="page <= 1"
      aria-label="Prethodna strana"
      @click="$emit('change', page - 1)"
    />
    <span>{{ page }} / {{ totalPages }}</span>
    <Button
      icon="pi pi-chevron-right"
      text
      rounded
      :disabled="page >= totalPages"
      aria-label="Sledeća strana"
      @click="$emit('change', page + 1)"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';

defineProps<{ page: number; totalPages: number }>();
defineEmits<{ change: [page: number] }>();
</script>

<style scoped>
.mobile-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 0 0;
  font-weight: 600;
  color: var(--text-secondary);
}
</style>
