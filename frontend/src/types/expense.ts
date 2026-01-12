export type Currency = 'EUR' | 'RSD';

export interface Expense {
  id: string;
  amount: number;
  originalCurrency: Currency;
  eurAmount: number;
  rsdAmount: number;
  exchangeRate: number;
  shopName: string;
  productDescription: string;
  category: string;
  paymentMethod: string;
  tags: string[];
  purchaseDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseDto {
  amount: number;
  currency: Currency;
  shopName: string;
  purchaseDate: string;
  createdBy: string;
  productDescription?: string;
  category?: string;
  paymentMethod?: string;
  tags?: string[];
}

export interface UpdateExpenseDto {
  amount?: number;
  currency?: Currency;
  shopName?: string;
  purchaseDate?: string;
  productDescription?: string;
  category?: string;
  paymentMethod?: string;
  tags?: string[];
}

export interface QueryExpensesDto {
  page?: number;
  limit?: number;
  category?: string;
  shopName?: string;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExpenseListResponse {
  data: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
