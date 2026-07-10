export interface Income {
  id: string;
  amount: number;
  originalCurrency: 'EUR' | 'RSD';
  eurAmount: number;
  rsdAmount: number;
  exchangeRate: number;
  source: string;
  description: string;
  incomeType: 'Salary' | 'Freelance' | 'Rent' | 'Investment' | 'Gift' | 'Other';
  dateReceived: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  recurringOccurrenceId?: string;
  creationMethod?: 'manual' | 'voice' | 'auto' | 'statement';
  voiceTranscript?: string;
  /** Bank transaction reference, set when imported from a statement (used for duplicate detection) */
  bankRef?: string;
  householdId?: string;
  createdByUid?: string;
}
