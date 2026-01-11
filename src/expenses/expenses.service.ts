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

    // Apply defaults for optional fields
    const productDescription = createExpenseDto.productDescription ||
      `Purchase at ${createExpenseDto.shopName}`;

    const category = createExpenseDto.category ||
      this.inferCategory(createExpenseDto.shopName) ||
      'General';

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

  private inferCategory(shopName: string): string | null {
    const shopLower = shopName.toLowerCase();

    // Supermarkets & Grocery Stores
    if (/(maxi|lidl|mercator|idea|tempo|aman|dis)/i.test(shopLower)) {
      return 'Groceries';
    }

    // Furniture & Home Improvement
    if (/(ikea|jysk|emezeta)/i.test(shopLower)) {
      return 'Home';
    }

    // Gas Stations & Transport
    if (/(nis|petrol|mol|lukoil|omv|parking|taxi|bolt|car)/i.test(shopLower)) {
      return 'Transport';
    }

    // Pharmacies & Health
    if (/(apoteka|pharmacy|lilly|benu|zegin)/i.test(shopLower)) {
      return 'Health';
    }

    // Electronics & Technology
    if (/(gigatron|tehnomanija|comtrade|mediamarkt|tech)/i.test(shopLower)) {
      return 'Electronics';
    }

    // Restaurants & Dining
    if (/(restoran|restaurant|cafe|kafana|pizza|burger|mcdon)/i.test(shopLower)) {
      return 'Dining';
    }

    // Clothing & Fashion
    if (/(zara|h&m|mango|new\s*yorker|fashion|clothes)/i.test(shopLower)) {
      return 'Clothing';
    }

    return null; // Will default to 'General' in calling code
  }
}
