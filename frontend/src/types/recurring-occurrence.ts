export type OccurrenceType = 'income' | 'expense';
export type RecurringFrequency = 'monthly' | 'weekly' | 'biweekly' | 'yearly';

export const recurringFrequencyLabels: Record<RecurringFrequency, string> = {
  monthly: 'Mesečno',
  weekly: 'Nedeljno',
  biweekly: 'Svake dve nedelje',
  yearly: 'Godišnje'
};

export interface RecurringOccurrence {
  id: string;
  occurrenceType: OccurrenceType;

  // Common
  amount: number;
  originalCurrency: 'EUR' | 'RSD';
  description: string;
  createdBy: string;

  // Income-specific
  source?: string;
  incomeType?: 'Salary' | 'Freelance' | 'Investment' | 'Gift' | 'Other';

  // Expense-specific
  expenseCategory?: string;
  store?: string;

  // Recurrence
  frequency: RecurringFrequency;
  recurringAt?: string;
  recurringUntil?: string;
  nextOccurrenceDate: string;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringOccurrenceDto {
  occurrenceType: OccurrenceType;
  amount: number;
  currency: 'EUR' | 'RSD';
  description?: string;

  // Income-specific
  source?: string;
  incomeType?: 'Salary' | 'Freelance' | 'Rent' | 'Investment' | 'Gift' | 'Other';

  // Expense-specific
  expenseCategory?: string;
  store?: string;

  // Recurrence
  frequency: RecurringFrequency;
  recurringAt?: string;
  recurringUntil?: string;
  startDate: string;
  createdBy: string;
}
