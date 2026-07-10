import apiClient from './client';
import type { Budget } from '@/types/budget';

export const budgetApi = {
  /**
   * Get all configured category budgets
   */
  getAll: async (): Promise<Budget[]> => {
    const response = await apiClient.get<Budget[]>('/budgets');
    return response.data;
  },

  /**
   * Create or update the monthly limit for a category
   */
  setLimit: async (category: string, monthlyLimit: number): Promise<Budget> => {
    const response = await apiClient.put<Budget>(`/budgets/${encodeURIComponent(category)}`, { monthlyLimit });
    return response.data;
  },

  /**
   * Remove the budget configured for a category
   */
  delete: async (category: string): Promise<void> => {
    await apiClient.delete(`/budgets/${encodeURIComponent(category)}`);
  }
};
