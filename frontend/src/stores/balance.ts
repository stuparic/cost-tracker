import { defineStore } from 'pinia';
import { ref } from 'vue';
import { expenseApi } from '@/api/expenses';
import { incomeApi } from '@/api/incomes';
import { getApiErrorMessage } from '@/api/client';
import type { Expense, QueryExpensesDto } from '@/types/expense';
import type { Income, QueryIncomesDto } from '@/types/income';

export type BalanceQueryParams = QueryExpensesDto & QueryIncomesDto;

export const useBalanceStore = defineStore('balance', () => {
  // State
  const expenses = ref<Expense[]>([]);
  const incomes = ref<Income[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastFetchTime = ref<Date | null>(null);
  const lastFetchParams = ref<BalanceQueryParams | null>(null);

  // Actions
  async function fetchBalanceData(params: BalanceQueryParams): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const [expensesResponse, incomesResponse] = await Promise.all([expenseApi.getAll(params), incomeApi.getAll(params)]);

      expenses.value = expensesResponse.data;
      incomes.value = incomesResponse.data;
      lastFetchTime.value = new Date();
      lastFetchParams.value = params;
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Greška pri učitavanju podataka bilansa');
      console.error('Failed to fetch balance data:', err);
      expenses.value = [];
      incomes.value = [];
    } finally {
      loading.value = false;
    }
  }

  function invalidateCache(): void {
    expenses.value = [];
    incomes.value = [];
    lastFetchTime.value = null;
    lastFetchParams.value = null;
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    expenses,
    incomes,
    loading,
    error,
    lastFetchTime,
    lastFetchParams,
    // Actions
    fetchBalanceData,
    invalidateCache,
    clearError
  };
});
