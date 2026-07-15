<template>
  <Select
    :model-value="modelValue"
    :options="options"
    option-label="label"
    option-value="value"
    :filter="true"
    filter-placeholder="Pretraži kategoriju"
    :auto-filter-focus="true"
    :placeholder="placeholder"
    class="category-select w-full"
    append-to="body"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #value="{ value }">
      <span v-if="value" class="cat-opt">
        <i :class="['pi', iconFor(value)]"></i>
        <span>{{ labelFor(value) }}</span>
      </span>
      <span v-else class="cat-placeholder">{{ placeholder }}</span>
    </template>
    <template #option="{ option }">
      <span class="cat-opt">
        <i :class="['pi', iconFor(option.value)]"></i>
        <span>{{ option.label }}</span>
      </span>
    </template>
  </Select>
</template>

<script setup lang="ts">
import Select from 'primevue/select';
import { EXPENSE_CATEGORIES, CATEGORY_LABELS, type ExpenseCategory } from '@/constants/categories';

defineProps<{ modelValue?: string; placeholder?: string }>();
defineEmits<{ 'update:modelValue': [value: string] }>();

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Groceries: 'pi-shopping-cart',
  Home: 'pi-home',
  Transport: 'pi-car',
  Dining: 'pi-shopping-bag',
  Health: 'pi-heart',
  Utilities: 'pi-bolt',
  Loan: 'pi-credit-card',
  Travel: 'pi-globe',
  Work: 'pi-briefcase',
  Transfers: 'pi-sync',
  Charity: 'pi-heart-fill',
  Other: 'pi-ellipsis-h'
};

const options = EXPENSE_CATEGORIES.map(value => ({ value, label: CATEGORY_LABELS[value] }));

function labelFor(value: string): string {
  return CATEGORY_LABELS[value as ExpenseCategory] ?? value;
}
function iconFor(value: string): string {
  return CATEGORY_ICONS[value as ExpenseCategory] ?? 'pi-tag';
}
</script>

<style scoped>
.cat-opt {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.cat-opt i {
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.cat-placeholder {
  color: var(--text-secondary);
}
</style>
