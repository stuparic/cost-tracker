import apiClient from './client';
import type { AutocompleteResponse } from '@/types/api';

export const autocompleteApi = {
  /**
   * Get shop name suggestions
   */
  getShops: async (search?: string): Promise<AutocompleteResponse> => {
    const response = await apiClient.get<AutocompleteResponse>('/autocomplete/shops', {
      params: search ? { search } : undefined
    });
    return response.data;
  },

  /**
   * Get product description suggestions
   */
  getProducts: async (search?: string): Promise<AutocompleteResponse> => {
    const response = await apiClient.get<AutocompleteResponse>('/autocomplete/products', {
      params: search ? { search } : undefined
    });
    return response.data;
  },

  /**
   * Get category suggestions
   */
  getCategories: async (search?: string): Promise<AutocompleteResponse> => {
    const response = await apiClient.get<AutocompleteResponse>('/autocomplete/categories', {
      params: search ? { search } : undefined
    });
    return response.data;
  },

  /**
   * Get tag suggestions
   */
  getTags: async (search?: string): Promise<AutocompleteResponse> => {
    const response = await apiClient.get<AutocompleteResponse>('/autocomplete/tags', {
      params: search ? { search } : undefined
    });
    return response.data;
  }
};
