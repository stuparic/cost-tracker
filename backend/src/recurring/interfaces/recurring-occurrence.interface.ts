export type OccurrenceType = 'income' | 'expense';
export type RecurringFrequency = 'monthly' | 'weekly' | 'biweekly' | 'yearly';

export interface RecurringOccurrence {
  id: string;
  occurrenceType: OccurrenceType;

  // Common fields
  amount: number;
  originalCurrency: 'EUR' | 'RSD';
  description: string;
  createdBy: string;

  // Income-specific (when occurrenceType === 'income')
  source?: string;
  incomeType?: 'Salary' | 'Freelance' | 'Investment' | 'Gift' | 'Other';

  // Expense-specific (when occurrenceType === 'expense')
  expenseCategory?: string;
  store?: string;

  // Recurrence config
  frequency: RecurringFrequency;
  recurringAt?: string;
  recurringUntil?: string;
  nextOccurrenceDate: string;

  // Status
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
