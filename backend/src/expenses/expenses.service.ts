import { Injectable } from '@nestjs/common';
import { CurrencyService } from '../currency/currency.service';
import { ExpensesRepository } from './expenses.repository';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { ExportExpensesDto } from './dto/export-expenses.dto';
import { Expense } from './interfaces/expense.interface';
import { CategoryInferenceService } from '../category-inference/category-inference.service';
import { Pagination } from '../common/interfaces/pagination.interface';
import { normalizeCreatedBy } from '../common/utils/normalize-created-by';
import { toCsv } from '../common/utils/csv.util';
import { HouseholdContext } from '../common/interfaces/household-context.interface';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class ExpensesService {
  constructor(
    private currencyService: CurrencyService,
    private expensesRepository: ExpensesRepository,
    private categoryInferenceService: CategoryInferenceService
  ) {}

  async create(createExpenseDto: CreateExpenseDto & { private?: boolean }, ctx?: HouseholdContext): Promise<Expense> {
    const { eurAmount, rsdAmount, exchangeRate } = this.currencyService.convertAmount(createExpenseDto.amount, createExpenseDto.currency);

    // Apply defaults for optional fields
    const productDescription = createExpenseDto.productDescription || `Purchase at ${createExpenseDto.shopName}`;

    const category = createExpenseDto.category || this.categoryInferenceService.inferCategory(createExpenseDto.shopName) || 'General';

    const paymentMethod = createExpenseDto.paymentMethod || 'Card';

    const tags = createExpenseDto.tags || [];

    const expenseData = {
      amount: createExpenseDto.amount,
      originalCurrency: createExpenseDto.currency,
      eurAmount,
      rsdAmount,
      exchangeRate,
      shopName: createExpenseDto.shopName,
      productDescription,
      category,
      paymentMethod,
      tags,
      purchaseDate: createExpenseDto.purchaseDate,
      createdBy: normalizeCreatedBy(createExpenseDto.createdBy),
      creationMethod: createExpenseDto.creationMethod,
      voiceTranscript: 'voiceTranscript' in createExpenseDto ? createExpenseDto.voiceTranscript : undefined,
      recurringOccurrenceId: 'recurringOccurrenceId' in createExpenseDto ? createExpenseDto.recurringOccurrenceId : undefined,
      bankRef: 'bankRef' in createExpenseDto ? createExpenseDto.bankRef : undefined,
      householdId: ctx?.householdId,
      createdByUid: ctx?.uid,
      private: createExpenseDto.private === true
    };

    return this.expensesRepository.create(expenseData);
  }

  async findAll(query: QueryExpensesDto, ctx?: HouseholdContext): Promise<{ data: Expense[]; pagination: Pagination }> {
    const { data, total } = await this.expensesRepository.findAll({ ...query, householdId: ctx?.householdId });

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
      total,
      totalPages: Math.ceil(total / (query.limit || 20))
    };

    return { data: data.map(expense => this.sanitize(expense, ctx)), pagination };
  }

  async findOne(id: string, ctx?: HouseholdContext): Promise<Expense> {
    const expense = await this.expensesRepository.findById(id);
    this.assertSameHousehold(expense, ctx);
    return this.sanitize(expense, ctx);
  }

  async existsByBankRef(bankRef: string, householdId?: string): Promise<boolean> {
    return this.expensesRepository.existsByBankRef(bankRef, householdId);
  }

  /** Details of other members' private expenses are masked */
  private sanitize(expense: Expense, ctx?: HouseholdContext): Expense {
    if (expense.private && expense.createdByUid && ctx && expense.createdByUid !== ctx.uid) {
      return {
        ...expense,
        shopName: 'Privatan trošak',
        productDescription: '',
        tags: [],
        voiceTranscript: undefined
      };
    }
    return expense;
  }

  private assertSameHousehold(expense: Expense, ctx?: HouseholdContext): void {
    if (ctx && expense.householdId && expense.householdId !== ctx.householdId) {
      throw new ForbiddenException('Ova stavka ne pripada tvom domaćinstvu');
    }
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto & { private?: boolean }, ctx?: HouseholdContext): Promise<Expense> {
    const existingExpense = await this.expensesRepository.findById(id);
    this.assertSameHousehold(existingExpense, ctx);

    const updateData: any = {};

    // Check if amount or currency changed, recalculate both currencies
    if (updateExpenseDto.amount !== undefined || updateExpenseDto.currency !== undefined) {
      const newAmount = updateExpenseDto.amount ?? existingExpense.amount;
      const newCurrency = updateExpenseDto.currency ?? existingExpense.originalCurrency;

      const { eurAmount, rsdAmount, exchangeRate } = this.currencyService.convertAmount(newAmount, newCurrency);

      updateData.amount = newAmount;
      updateData.originalCurrency = newCurrency;
      updateData.eurAmount = eurAmount;
      updateData.rsdAmount = rsdAmount;
      updateData.exchangeRate = exchangeRate;
    }

    // Update other fields if provided
    if (updateExpenseDto.shopName !== undefined) {
      updateData.shopName = updateExpenseDto.shopName;
    }
    if (updateExpenseDto.productDescription !== undefined) {
      updateData.productDescription = updateExpenseDto.productDescription;
    }
    if (updateExpenseDto.category !== undefined) {
      updateData.category = updateExpenseDto.category;
    }
    if (updateExpenseDto.paymentMethod !== undefined) {
      updateData.paymentMethod = updateExpenseDto.paymentMethod;
    }
    if (updateExpenseDto.tags !== undefined) {
      updateData.tags = updateExpenseDto.tags;
    }
    if (updateExpenseDto.purchaseDate !== undefined) {
      updateData.purchaseDate = updateExpenseDto.purchaseDate;
    }
    if (updateExpenseDto.createdBy !== undefined) {
      updateData.createdBy = updateExpenseDto.createdBy;
    }
    if (updateExpenseDto.private !== undefined) {
      updateData.private = updateExpenseDto.private === true;
    }

    return this.expensesRepository.update(id, updateData);
  }

  async remove(id: string, ctx?: HouseholdContext): Promise<void> {
    const existing = await this.expensesRepository.findById(id);
    this.assertSameHousehold(existing, ctx);
    return this.expensesRepository.delete(id);
  }

  /**
   * Returns every household expense. Used for the full JSON backup.
   */
  async exportAll(ctx?: HouseholdContext): Promise<Expense[]> {
    const expenses = await this.expensesRepository.findAllForExport({ householdId: ctx?.householdId });
    return expenses.map(expense => this.sanitize(expense, ctx));
  }

  async exportCsv(query: ExportExpensesDto, ctx?: HouseholdContext): Promise<string> {
    const raw = await this.expensesRepository.findAllForExport({ ...query, householdId: ctx?.householdId });
    const expenses = raw.map(expense => this.sanitize(expense, ctx));

    return toCsv(expenses, [
      { header: 'Datum', value: e => e.purchaseDate?.slice(0, 10) },
      { header: 'Prodavnica', value: e => e.shopName },
      { header: 'Opis', value: e => e.productDescription },
      { header: 'Kategorija', value: e => e.category },
      { header: 'Iznos', value: e => e.amount },
      { header: 'Valuta', value: e => e.originalCurrency },
      { header: 'Iznos (EUR)', value: e => e.eurAmount },
      { header: 'Iznos (RSD)', value: e => e.rsdAmount },
      { header: 'Način plaćanja', value: e => e.paymentMethod },
      { header: 'Osoba', value: e => e.createdBy },
      { header: 'Tagovi', value: e => e.tags?.join('; ') }
    ]);
  }
}
