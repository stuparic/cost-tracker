import { defineStore } from 'pinia';
import { ref } from 'vue';
import { incomeApi } from '@/api/incomes';
import type { Income, CreateIncomeDto, IncomeListResponse } from '@/types/income';
import { useBalanceStore } from './balance';

export const useIncomesStore = defineStore('incomes', () => {
  // State
  const incomes = ref<Income[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Actions
  async function createIncome(data: CreateIncomeDto): Promise<Income> {
    loading.value = true;
    error.value = null;
    try {
      const income = await incomeApi.create(data);
      incomes.value.unshift(income); // Add to beginning of list

      // Invalidate balance cache
      const balanceStore = useBalanceStore();
      balanceStore.invalidateCache();

      return income;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Greška pri kreiranju prihoda';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchIncomes(params?: any): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response: IncomeListResponse = await incomeApi.getAll(params);
      incomes.value = response.data;
      pagination.value = response.pagination;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Greška pri učitavanju prihoda';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteIncome(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await incomeApi.delete(id);
      incomes.value = incomes.value.filter(i => i.id !== id);

      // Invalidate balance cache
      const balanceStore = useBalanceStore();
      balanceStore.invalidateCache();
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Greška pri brisanju prihoda';
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
    incomes,
    loading,
    error,
    pagination,
    // Actions
    createIncome,
    fetchIncomes,
    deleteIncome,
    clearError,
  };
});
