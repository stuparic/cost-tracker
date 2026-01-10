import { Injectable } from '@nestjs/common';
import { CurrencyService } from '../currency/currency.service';
import { ExpensesRepository } from './expenses.repository';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { Expense } from './interfaces/expense.interface';

@Injectable()
export class ExpensesService {
  constructor(
    private currencyService: CurrencyService,
    private expensesRepository: ExpensesRepository,
  ) {}

  async create(createExpenseDto: CreateExpenseDto): Promise<Expense> {
    const exchangeRate = this.currencyService.getCurrentRate();
    let eurAmount: number;
    let rsdAmount: number;

    // Calculate both currency amounts based on which one was entered
    if (createExpenseDto.currency === 'EUR') {
      eurAmount = createExpenseDto.amount;
      rsdAmount = this.currencyService.convertEurToRsd(eurAmount);
    } else {
      // RSD
      rsdAmount = createExpenseDto.amount;
      eurAmount = this.currencyService.convertRsdToEur(rsdAmount);
    }

    const expenseData = {
      amount: createExpenseDto.amount,
      originalCurrency: createExpenseDto.currency,
      eurAmount,
      rsdAmount,
      exchangeRate,
      shopName: createExpenseDto.shopName,
      productDescription: createExpenseDto.productDescription,
      category: createExpenseDto.category,
      paymentMethod: createExpenseDto.paymentMethod,
      tags: createExpenseDto.tags,
      purchaseDate: createExpenseDto.purchaseDate,
    };

    return this.expensesRepository.create(expenseData);
  }

  async findAll(
    query: QueryExpensesDto,
  ): Promise<{ data: Expense[]; pagination: any }> {
    const { data, total } = await this.expensesRepository.findAll(query);

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
      total,
      totalPages: Math.ceil(total / (query.limit || 20)),
    };

    return { data, pagination };
  }

  async findOne(id: string): Promise<Expense> {
    return this.expensesRepository.findById(id);
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto): Promise<Expense> {
    const existingExpense = await this.expensesRepository.findById(id);

    const updateData: any = {};

    // Check if amount or currency changed, recalculate both currencies
    if (
      updateExpenseDto.amount !== undefined ||
      updateExpenseDto.currency !== undefined
    ) {
      const newAmount = updateExpenseDto.amount ?? existingExpense.amount;
      const newCurrency =
        updateExpenseDto.currency ?? existingExpense.originalCurrency;
      const exchangeRate = this.currencyService.getCurrentRate();

      let eurAmount: number;
      let rsdAmount: number;

      if (newCurrency === 'EUR') {
        eurAmount = newAmount;
        rsdAmount = this.currencyService.convertEurToRsd(eurAmount);
      } else {
        rsdAmount = newAmount;
        eurAmount = this.currencyService.convertRsdToEur(rsdAmount);
      }

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

    return this.expensesRepository.update(id, updateData);
  }

  async remove(id: string): Promise<void> {
    return this.expensesRepository.delete(id);
  }
}
