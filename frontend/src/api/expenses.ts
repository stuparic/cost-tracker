import apiClient from './client';
import type { Expense, CreateExpenseDto, UpdateExpenseDto, QueryExpensesDto, ExpenseListResponse } from '@/types/expense';

export const expenseApi = {
  /**
   * Create a new expense
   */
  create: async (data: CreateExpenseDto): Promise<Expense> => {
    const response = await apiClient.post<Expense>('/expenses', data);
    return response.data;
  },

  /**
   * Get all expenses with optional filters and pagination
   */
  getAll: async (params?: QueryExpensesDto): Promise<ExpenseListResponse> => {
    const response = await apiClient.get<ExpenseListResponse>('/expenses', { params });
    return response.data;
  },

  /**
   * Get a single expense by ID
   */
  getById: async (id: string): Promise<Expense> => {
    const response = await apiClient.get<Expense>(`/expenses/${id}`);
    return response.data;
  },

  /**
   * Update an expense
   */
  update: async (id: string, data: UpdateExpenseDto): Promise<Expense> => {
    const response = await apiClient.patch<Expense>(`/expenses/${id}`, data);
    return response.data;
  },

  /**
   * Delete an expense
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`);
  },

  /**
   * Export expenses matching the given filters as a CSV blob
   */
  exportCsv: async (params?: Omit<QueryExpensesDto, 'page' | 'limit' | 'sortBy' | 'sortOrder'>): Promise<Blob> => {
    const response = await apiClient.get('/expenses/export/csv', { params, responseType: 'blob' });
    return response.data;
  }
};
