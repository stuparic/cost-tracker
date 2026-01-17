export interface AiParseResult {
  type: 'expense' | 'income';
  success: boolean;
  data?: {
    amount: number;
    currency: 'EUR' | 'RSD';
    shopOrSource: string;
    description?: string;
    category?: string; // For expenses only
    incomeType?: string; // For incomes only
    date?: string; // ISO 8601 format, defaults to today
  };
  error?: string;
  confidence?: 'high' | 'medium' | 'low';
}
