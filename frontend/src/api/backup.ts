import apiClient from './client';

export const backupApi = {
  /**
   * Downloads a full, unfiltered JSON backup of all expenses, incomes and budgets.
   */
  exportJson: async (): Promise<Blob> => {
    const response = await apiClient.get('/backup/json', { responseType: 'blob' });
    return response.data;
  }
};
