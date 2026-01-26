import { Injectable } from '@nestjs/common';
import { EXPENSE_CATEGORIES, INCOME_TYPES } from '../constants/categories';
import { SERBIAN_SHOPS } from '../constants/serbian-shops';

@Injectable()
export class PromptBuilderService {
  /**
   * Builds the AI prompt for parsing voice transcript
   * @param transcript The voice transcript to parse
   * @returns Formatted prompt string for the AI
   */
  buildParsePrompt(transcript: string): string {
    const today = new Date().toISOString().split('T')[0];

    return `You are a financial transaction parser for a Serbian household expense tracker.

Parse this Serbian text and extract transaction information:
"${transcript}"

Determine:
1. Is this an EXPENSE (trošak) or INCOME (prihod)?
2. Extract the amount and currency (RSD or EUR)
3. Extract shop name (for expense) or income source (for income)
   IMPORTANT: Shop name MUST be matched from this EXACT list of Serbian retailers:
   ${this.formatShopList()}

   - Match the shop name as closely as possible to one from the list above
   - If the shop is not in the list or you cannot identify it clearly, use "Other"
   - Use EXACT spelling from the list (case-sensitive)
   - Common variations: "Maksi" → "Maxi", "NIS petrol" → "NIS", "Lidl market" → "Lidl"

4. Extract or generate a brief description
5. For expenses, infer the category from this list: ${this.formatCategories()}
6. For incomes, infer the income type from this list: ${this.formatIncomeTypes()}
7. Extract or infer the date (if mentioned like "juče", "danas", "prošle nedelje")

Return ONLY valid JSON (no markdown, no code blocks):
{
  "type": "expense" or "income",
  "amount": number,
  "currency": "RSD" or "EUR",
  "shopOrSource": "shop/source name from the list above or Other",
  "description": "brief description",
  "category": "one of the allowed categories (expenses only, omit for income)",
  "incomeType": "one of the allowed income types (incomes only, omit for expense)",
  "date": "YYYY-MM-DD format or null for today",
  "confidence": "high", "medium", or "low"
}

Rules:
- If no amount found, return confidence: "low"
- If currency not mentioned, assume RSD for amounts < 1000, EUR for amounts >= 1000
- Shop name must be EXACTLY from the provided list, or "Other" if not found
- Category must be exactly one from the expense list (case-sensitive)
- IncomeType must be exactly one from the income list (case-sensitive)
- Date should be relative to today (${today})
- If unsure about type, default to "expense"
- Always return valid JSON`;
  }

  /**
   * Formats the shop list for inclusion in the prompt
   */
  private formatShopList(): string {
    return SERBIAN_SHOPS.join(', ');
  }

  /**
   * Formats expense categories for inclusion in the prompt
   */
  private formatCategories(): string {
    return EXPENSE_CATEGORIES.join(', ');
  }

  /**
   * Formats income types for inclusion in the prompt
   */
  private formatIncomeTypes(): string {
    return INCOME_TYPES.join(', ');
  }
}
