export interface Expense {
  id: string;
  amount: number;
  originalCurrency: 'EUR' | 'RSD';
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
