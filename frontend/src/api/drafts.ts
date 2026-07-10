import apiClient from './client';
import type { Expense } from '@/types/expense';

export interface ExpenseDraft {
  id: string;
  amount: number;
  currency: 'EUR' | 'RSD';
  shopName: string;
  productDescription?: string;
  category?: string;
  paymentMethod?: string;
  tags?: string[];
  purchaseDate: string;
  createdBy: string;
  createdByUid: string;
  bankRef?: string;
  createdAt: string;
}

export const draftsApi = {
  /** My pending drafts (backend scopes them to the signed-in user) */
  listMine: async (): Promise<ExpenseDraft[]> => {
    const response = await apiClient.get<ExpenseDraft[]>('/expense-drafts');
    return response.data;
  },

  /** Confirms a single draft; it becomes a real expense */
  confirm: async (id: string): Promise<Expense> => {
    const response = await apiClient.post<Expense>(`/expense-drafts/${id}/confirm`);
    return response.data;
  },

  /** Confirms every draft belonging to me */
  confirmAll: async (): Promise<{ confirmed: number }> => {
    const response = await apiClient.post<{ confirmed: number }>('/expense-drafts/confirm-all');
    return response.data;
  },

  /** Discards a draft without recording anything */
  discard: async (id: string): Promise<void> => {
    await apiClient.delete(`/expense-drafts/${id}`);
  }
};
