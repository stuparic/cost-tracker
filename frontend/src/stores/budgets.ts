import { defineStore } from 'pinia';
import { ref } from 'vue';
import { budgetApi } from '@/api/budgets';
import { getApiErrorMessage } from '@/api/client';
import type { Budget } from '@/types/budget';

export const useBudgetsStore = defineStore('budgets', () => {
  // State
  const budgets = ref<Budget[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const loaded = ref(false);

  // Actions
  async function fetchBudgets(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      budgets.value = await budgetApi.getAll();
      loaded.value = true;
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Greška pri učitavanju budžeta');
      console.error('Failed to fetch budgets:', err);
    } finally {
      loading.value = false;
    }
  }

  async function saveBudget(category: string, monthlyLimit: number): Promise<void> {
    const updated = await budgetApi.setLimit(category, monthlyLimit);
    const index = budgets.value.findIndex(b => b.category === category);
    if (index >= 0) {
      budgets.value[index] = updated;
    } else {
      budgets.value.push(updated);
    }
  }

  async function removeBudget(category: string): Promise<void> {
    await budgetApi.delete(category);
    budgets.value = budgets.value.filter(b => b.category !== category);
  }

  function getLimit(category: string): number | undefined {
    return budgets.value.find(b => b.category === category)?.monthlyLimit;
  }

  return {
    // State
    budgets,
    loading,
    error,
    loaded,
    // Actions
    fetchBudgets,
    saveBudget,
    removeBudget,
    getLimit
  };
});
