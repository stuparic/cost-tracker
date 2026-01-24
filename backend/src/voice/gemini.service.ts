import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { EXPENSE_CATEGORIES, INCOME_TYPES } from '../constants/categories';
import { AiParseResult } from './interfaces/ai-parse-result.interface';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenAI;

  constructor() {
    this.genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }

  async parseVoiceTranscript(transcript: string): Promise<AiParseResult> {
    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: this.buildPrompt(transcript)
      });

      // Parse JSON response
      return this.parseAiResponse(result.text);
    } catch (error) {
      this.logger.error('Gemini API error:', error);
      return {
        type: 'expense',
        success: false,
        error: 'Failed to parse transcript with AI'
      };
    }
  }

  private buildPrompt(transcript: string): string {
    return `You are a financial transaction parser for a Serbian household expense tracker.

Parse this Serbian text and extract transaction information:
"${transcript}"

Determine:
1. Is this an EXPENSE (trošak) or INCOME (prihod)?
2. Extract the amount and currency (RSD or EUR)
3. Extract shop name (for expense) or income source (for income)
4. Extract or generate a brief description
5. For expenses, infer the category from this list: ${EXPENSE_CATEGORIES.join(', ')}
6. For incomes, infer the income type from this list: ${INCOME_TYPES.join(', ')}
7. Extract or infer the date (if mentioned like "juče", "danas", "prošle nedelje")

Return ONLY valid JSON (no markdown, no code blocks):
{
  "type": "expense" or "income",
  "amount": number,
  "currency": "RSD" or "EUR",
  "shopOrSource": "shop/source name",
  "description": "brief description",
  "category": "one of the allowed categories (expenses only, omit for income)",
  "incomeType": "one of the allowed income types (incomes only, omit for expense)",
  "date": "YYYY-MM-DD format or null for today",
  "confidence": "high", "medium", or "low"
}

Rules:
- If no amount found, return confidence: "low"
- If currency not mentioned, assume RSD for amounts < 1000, EUR for amounts >= 1000
- Category must be exactly one from the expense list (case-sensitive)
- IncomeType must be exactly one from the income list (case-sensitive)
- Date should be relative to today (${new Date().toISOString().split('T')[0]})
- If unsure about type, default to "expense"
- Always return valid JSON`;
  }

  private parseAiResponse(text: string): AiParseResult {
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const validationError = this.validateParsedData(parsed);
      if (validationError) {
        return { type: 'expense', success: false, error: validationError };
      }

      this.normalizeCategories(parsed);

      return {
        type: parsed.type,
        success: true,
        data: {
          amount: parsed.amount,
          currency: parsed.currency,
          shopOrSource: parsed.shopOrSource,
          description: parsed.description || undefined,
          category: parsed.category || (parsed.type === 'expense' ? 'Other' : undefined),
          incomeType: parsed.incomeType || (parsed.type === 'income' ? 'Other' : undefined),
          date: parsed.date || undefined
        },
        confidence: parsed.confidence || 'medium'
      };
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error);
      return { type: 'expense', success: false, error: 'Invalid AI response format' };
    }
  }

  private validateParsedData(parsed: any): string | null {
    if (!parsed.type || !['expense', 'income'].includes(parsed.type)) return 'Invalid type';
    if (!parsed.amount || typeof parsed.amount !== 'number') return 'Invalid amount';
    if (!parsed.currency || !['EUR', 'RSD'].includes(parsed.currency)) return 'Invalid currency';
    if (!parsed.shopOrSource || typeof parsed.shopOrSource !== 'string') return 'Invalid shop/source';
    return null;
  }

  private normalizeCategories(parsed: any): void {
    if (parsed.type === 'expense' && parsed.category && !EXPENSE_CATEGORIES.includes(parsed.category)) {
      this.logger.warn(`Invalid category "${parsed.category}", defaulting to "Other"`);
      parsed.category = 'Other';
    }
    if (parsed.type === 'income' && parsed.incomeType && !INCOME_TYPES.includes(parsed.incomeType)) {
      this.logger.warn(`Invalid income type "${parsed.incomeType}", defaulting to "Other"`);
      parsed.incomeType = 'Other';
    }
  }
}
