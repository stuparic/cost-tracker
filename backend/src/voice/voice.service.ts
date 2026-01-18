import { Injectable, Logger } from '@nestjs/common';
import { VoiceParseDto } from './dto/voice-parse.dto';
import { GeminiService } from './gemini.service';
import { ExpensesService } from '../expenses/expenses.service';
import { IncomesService } from '../incomes/incomes.service';
import { CreateExpenseDto } from '../expenses/dto/create-expense.dto';
import { CreateIncomeDto } from '../incomes/dto/create-income.dto';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly expensesService: ExpensesService,
    private readonly incomesService: IncomesService
  ) {}

  async parseAndCreate(dto: VoiceParseDto) {
    const aiResult = await this.geminiService.parseVoiceTranscript(dto.text);

    if (!aiResult.success || !aiResult.data) {
      throw new Error(aiResult.error || 'Failed to parse transcript');
    }

    const { type, data } = aiResult;

    if (type === 'expense') {
      const createDto: CreateExpenseDto = {
        amount: data.amount,
        currency: data.currency,
        shopName: data.shopOrSource,
        productDescription: data.description,
        category: data.category,
        purchaseDate: data.date || new Date().toISOString(),
        createdBy: dto.createdBy,
        creationMethod: 'voice',
        voiceTranscript: dto.text
      };
      return this.expensesService.create(createDto);
    } else {
      const createDto: CreateIncomeDto = {
        amount: data.amount,
        currency: data.currency,
        source: data.shopOrSource,
        description: data.description,
        incomeType: (data.incomeType as any) || 'Other', // AI-inferred income type
        dateReceived: data.date || new Date().toISOString(),
        createdBy: dto.createdBy,
        creationMethod: 'voice',
        voiceTranscript: dto.text
      };
      return this.incomesService.create(createDto);
    }
  }
}
