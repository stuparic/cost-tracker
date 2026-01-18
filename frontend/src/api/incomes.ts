import apiClient from './client';
import type { Income, CreateIncomeDto, UpdateIncomeDto, QueryIncomesDto, IncomeListResponse } from '@/types/income';

export const incomeApi = {
  /**
   * Create a new income
   */
  create: async (data: CreateIncomeDto): Promise<Income> => {
    const response = await apiClient.post<Income>('/incomes', data);
    return response.data;
  },

  /**
   * Get all incomes with optional filters and pagination
   */
  getAll: async (params?: QueryIncomesDto): Promise<IncomeListResponse> => {
    const response = await apiClient.get<IncomeListResponse>('/incomes', { params });
    return response.data;
  },

  /**
   * Get a single income by ID
   */
  getById: async (id: string): Promise<Income> => {
    const response = await apiClient.get<Income>(`/incomes/${id}`);
    return response.data;
  },

  /**
   * Update an income
   */
  update: async (id: string, data: UpdateIncomeDto): Promise<Income> => {
    const response = await apiClient.patch<Income>(`/incomes/${id}`, data);
    return response.data;
  },

  /**
   * Delete an income
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/incomes/${id}`);
  }
};
