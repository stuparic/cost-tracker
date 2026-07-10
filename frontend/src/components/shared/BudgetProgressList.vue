<template>
  <div class="budget-list">
    <div v-for="category in EXPENSE_CATEGORIES" :key="category" class="budget-row">
      <div class="budget-row-header">
        <span class="budget-category">{{ CATEGORY_LABELS[category] }}</span>

        <div v-if="editingCategory !== category" class="budget-row-actions">
          <span v-if="limitFor(category) !== undefined" class="budget-amounts" :class="statusClass(category)">
            {{ formatRSD(spentFor(category)) }} / {{ formatRSD(limitFor(category)!) }}
          </span>
          <span v-else class="budget-amounts budget-amounts-unset">Budžet nije podešen</span>

          <Button icon="pi pi-pencil" text rounded size="small" class="budget-icon-btn" @click="startEdit(category)" />
          <Button
            v-if="limitFor(category) !== undefined"
            icon="pi pi-trash"
            text
            rounded
            size="small"
            class="budget-icon-btn budget-icon-btn-danger"
            @click="handleRemove(category)"
          />
        </div>

        <div v-else class="budget-edit-controls">
          <InputNumber v-model="editValue" mode="decimal" :min="0" :max-fraction-digits="0" suffix=" RSD" class="budget-edit-input" autofocus />
          <Button icon="pi pi-check" rounded size="small" class="budget-icon-btn" :loading="saving" @click="confirmEdit(category)" />
          <Button icon="pi pi-times" text rounded size="small" class="budget-icon-btn" @click="cancelEdit" />
        </div>
      </div>

      <div v-if="limitFor(category) !== undefined" class="budget-progress-track">
        <div class="budget-progress-fill" :class="statusClass(category)" :style="{ width: progressPercent(category) + '%' }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { useListFormatting } from '@/composables/useListFormatting';
import { useAppToast } from '@/composables/useAppToast';
import { EXPENSE_CATEGORIES, CATEGORY_LABELS, type ExpenseCategory } from '@/constants/categories';
import { useBudgetsStore } from '@/stores/budgets';

const props = defineProps<{
  spentByCategory: Record<string, number>;
}>();

const { formatRSD } = useListFormatting();
const { showSuccess, showError } = useAppToast();
const budgetsStore = useBudgetsStore();

const editingCategory = ref<ExpenseCategory | null>(null);
const editValue = ref<number>(0);
const saving = ref(false);

function spentFor(category: string): number {
  return props.spentByCategory[category] || 0;
}

function limitFor(category: string): number | undefined {
  return budgetsStore.getLimit(category);
}

function progressPercent(category: string): number {
  const limit = limitFor(category);
  if (!limit) return 0;
  return Math.min(100, (spentFor(category) / limit) * 100);
}

function statusClass(category: string): string {
  const limit = limitFor(category);
  if (!limit) return '';
  const ratio = spentFor(category) / limit;
  if (ratio > 1) return 'budget-status-over';
  if (ratio >= 0.8) return 'budget-status-warning';
  return 'budget-status-ok';
}

function startEdit(category: ExpenseCategory) {
  editingCategory.value = category;
  editValue.value = limitFor(category) ?? 0;
}

function cancelEdit() {
  editingCategory.value = null;
}

async function confirmEdit(category: ExpenseCategory) {
  saving.value = true;
  try {
    await budgetsStore.saveBudget(category, editValue.value ?? 0);
    showSuccess(`Budžet za "${CATEGORY_LABELS[category]}" je sačuvan.`);
    editingCategory.value = null;
  } catch (err) {
    showError('Greška pri čuvanju budžeta', err);
  } finally {
    saving.value = false;
  }
}

async function handleRemove(category: ExpenseCategory) {
  try {
    await budgetsStore.removeBudget(category);
    showSuccess(`Budžet za "${CATEGORY_LABELS[category]}" je uklonjen.`);
  } catch (err) {
    showError('Greška pri uklanjanju budžeta', err);
  }
}
</script>

<style scoped>
.budget-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.budget-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.budget-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.budget-category {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.budget-row-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.budget-amounts {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.budget-amounts-unset {
  font-weight: 400;
  font-style: italic;
}

.budget-status-ok {
  color: var(--income-dark);
}

.budget-status-warning {
  color: #b8790f;
}

.budget-status-over {
  color: var(--expense-dark);
}

.budget-icon-btn {
  width: 2rem;
  height: 2rem;
  color: var(--text-secondary) !important;
}

.budget-icon-btn-danger:hover {
  color: var(--expense-color) !important;
}

.budget-edit-controls {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.budget-edit-input {
  width: 140px;
}

.budget-progress-track {
  height: 8px;
  border-radius: 999px;
  background: var(--surface-hover);
  overflow: hidden;
}

.budget-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--income-color);
  transition: width 0.2s ease;
}

.budget-status-ok.budget-progress-fill {
  background: var(--income-color);
}

.budget-status-warning.budget-progress-fill {
  background: #e0a11e;
}

.budget-status-over.budget-progress-fill {
  background: var(--expense-color);
}
</style>
