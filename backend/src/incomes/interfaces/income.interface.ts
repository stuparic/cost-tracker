export interface Income {
  id: string;
  amount: number;
  originalCurrency: 'EUR' | 'RSD';
  eurAmount: number;
  rsdAmount: number;
  exchangeRate: number;
  source: string;
  description: string;
  incomeType: 'Salary' | 'Freelance' | 'Investment' | 'Gift' | 'Other';
  dateReceived: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
