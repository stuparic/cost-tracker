<template>
  <div v-for="n in count" :key="n" class="skeleton-card">
    <div class="skeleton-line w-40"></div>
    <div class="skeleton-line w-70"></div>
    <div class="skeleton-line w-55"></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 4 });
</script>

<style scoped>
.skeleton-card {
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 12px);
  padding: 0.875rem 1rem;
  margin-bottom: 0.75rem;
  box-shadow: var(--shadow-card);
}

.skeleton-line {
  height: 0.875rem;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--border-color) 25%, var(--surface-hover) 50%, var(--border-color) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s infinite;
  margin-bottom: 0.625rem;
}

.skeleton-line.w-40 {
  width: 40%;
}

.skeleton-line.w-55 {
  width: 55%;
}

.skeleton-line.w-70 {
  width: 70%;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
