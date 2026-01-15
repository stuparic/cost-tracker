import { defineStore } from 'pinia';
import { ref } from 'vue';
import { expenseApi } from '@/api/expenses';
import type { Expense, CreateExpenseDto, ExpenseListResponse } from '@/types/expense';
import { useBalanceStore } from './balance';

export const useExpensesStore = defineStore('expenses', () => {
  // State
  const expenses = ref<Expense[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Actions
  async function createExpense(data: CreateExpenseDto): Promise<Expense> {
    loading.value = true;
    error.value = null;
    try {
      const expense = await expenseApi.create(data);
      expenses.value.unshift(expense); // Add to beginning of list

      // Invalidate balance cache
      const balanceStore = useBalanceStore();
      balanceStore.invalidateCache();

      return expense;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Greška pri kreiranju troška';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchExpenses(params?: any): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response: ExpenseListResponse = await expenseApi.getAll(params);
      expenses.value = response.data;
      pagination.value = response.pagination;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Greška pri učitavanju troškova';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteExpense(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await expenseApi.delete(id);
      expenses.value = expenses.value.filter(e => e.id !== id);

      // Invalidate balance cache
      const balanceStore = useBalanceStore();
      balanceStore.invalidateCache();
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Greška pri brisanju troška';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    // State
    expenses,
    loading,
    error,
    pagination,
    // Actions
    createExpense,
    fetchExpenses,
    deleteExpense,
    clearError,
  };
});
