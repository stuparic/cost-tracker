<template>
  <div class="currency-pills">
    <button
      v-for="curr in currencies"
      :key="curr.value"
      type="button"
      class="currency-pill"
      :class="{ active: modelValue === curr.value }"
      @click="$emit('update:modelValue', curr.value)"
    >
      {{ curr.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { CURRENCIES } from '@/constants/app';
import type { Currency } from '@/types/expense';

defineProps<{
  modelValue: Currency;
}>();

defineEmits<{
  (e: 'update:modelValue', value: Currency): void;
}>();

const currencies = CURRENCIES;
</script>

<style scoped>
.currency-pills {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.currency-pill {
  padding: 0.5rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 2rem;
  background: white;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.currency-pill:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.currency-pill.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}
</style>
