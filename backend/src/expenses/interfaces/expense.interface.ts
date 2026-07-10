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
  recurringOccurrenceId?: string;
  creationMethod?: 'manual' | 'voice' | 'auto' | 'statement';
  voiceTranscript?: string;
  /** Bank transaction reference (from imported statements) — used for duplicate detection */
  bankRef?: string;
  /** Household this expense belongs to (every query is scoped by it) */
  householdId?: string;
  /** Firebase uid of the member who created it */
  createdByUid?: string;
  /** Private expenses hide their details from other household members */
  private?: boolean;
}
