import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { EXPENSE_CATEGORIES, INCOME_TYPES } from '../constants/categories';
import { AiParseResult } from './interfaces/ai-parse-result.interface';
import { PromptBuilderService } from './prompt-builder.service';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenAI;

  constructor(private readonly promptBuilder: PromptBuilderService) {
    const apiKey = process.env.GEMINI_API_KEY;
    this.logger.log(`GEMINI_API_KEY is ${apiKey ? 'SET' : 'NOT SET'}`);
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY environment variable is not set');
    }
    this.genAI = new GoogleGenAI({
      apiKey: apiKey
    });
  }

  async parseVoiceTranscript(transcript: string): Promise<AiParseResult> {
    const modelName = process.env.GEMINI_MODEL_NAME;
    try {
      const result = await this.genAI.models.generateContent({
        model: modelName,
        contents: this.promptBuilder.buildParsePrompt(transcript)
      });

      console.log("Gemini response", result);
      this.logger.warn("Gemini raw response: " + JSON.stringify(result));

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
