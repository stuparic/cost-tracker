export type Currency = 'EUR' | 'RSD';
export type IncomeType = 'Salary' | 'Freelance' | 'Rent' | 'Investment' | 'Gift' | 'Other';
export type CreationMethod = 'manual' | 'voice' | 'auto';

// Serbian labels for income types
export const incomeTypeLabels: Record<IncomeType, string> = {
  Salary: 'Plata',
  Freelance: 'Honorar',
  Rent: 'Zakup',
  Investment: 'Investicija',
  Gift: 'Poklon',
  Other: 'Ostalo',
};

export interface Income {
  id: string;
  amount: number;
  originalCurrency: Currency;
  eurAmount: number;
  rsdAmount: number;
  exchangeRate: number;
  source: string;
  description: string;
  incomeType: IncomeType;
  dateReceived: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  recurringOccurrenceId?: string;
  creationMethod?: CreationMethod;
  voiceTranscript?: string;
}

export interface CreateIncomeDto {
  amount: number;
  currency: Currency;
  source: string;
  incomeType: IncomeType;
  dateReceived: string;
  createdBy: string;
  description?: string;
}

export interface UpdateIncomeDto {
  amount?: number;
  currency?: Currency;
  source?: string;
  incomeType?: IncomeType;
  dateReceived?: string;
  description?: string;
}

export interface QueryIncomesDto {
  page?: number;
  limit?: number;
  incomeType?: string;
  source?: string;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IncomeListResponse {
  data: Income[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
