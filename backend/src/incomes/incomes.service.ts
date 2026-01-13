import { Injectable } from '@nestjs/common';
import { CurrencyService } from '../currency/currency.service';
import { IncomesRepository } from './incomes.repository';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { QueryIncomesDto } from './dto/query-incomes.dto';
import { Income } from './interfaces/income.interface';

@Injectable()
export class IncomesService {
  constructor(private currencyService: CurrencyService, private incomesRepository: IncomesRepository) {}

  async create(createIncomeDto: CreateIncomeDto): Promise<Income> {
    const exchangeRate = this.currencyService.getCurrentRate();
    let eurAmount: number;
    let rsdAmount: number;

    // Calculate both currency amounts based on which one was entered
    if (createIncomeDto.currency === 'EUR') {
      eurAmount = createIncomeDto.amount;
      rsdAmount = this.currencyService.convertEurToRsd(eurAmount);
    } else {
      // RSD
      rsdAmount = createIncomeDto.amount;
      eurAmount = this.currencyService.convertRsdToEur(rsdAmount);
    }

    // Apply default description if not provided
    const description = createIncomeDto.description || `Income from ${createIncomeDto.source}`;

    const incomeData = {
      amount: createIncomeDto.amount,
      originalCurrency: createIncomeDto.currency,
      eurAmount,
      rsdAmount,
      exchangeRate,
      source: createIncomeDto.source,
      description,
      incomeType: createIncomeDto.incomeType,
      dateReceived: createIncomeDto.dateReceived,
      createdBy: createIncomeDto.createdBy,
    };

    return this.incomesRepository.create(incomeData);
  }

  async findAll(query: QueryIncomesDto): Promise<{ data: Income[]; pagination: any }> {
    const { data, total } = await this.incomesRepository.findAll(query);

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
      total,
      totalPages: Math.ceil(total / (query.limit || 20)),
    };

    return { data, pagination };
  }

  async findOne(id: string): Promise<Income> {
    return this.incomesRepository.findById(id);
  }

  async update(id: string, updateIncomeDto: UpdateIncomeDto): Promise<Income> {
    const existingIncome = await this.incomesRepository.findById(id);

    const updateData: any = {};

    // Check if amount or currency changed, recalculate both currencies
    if (updateIncomeDto.amount !== undefined || updateIncomeDto.currency !== undefined) {
      const newAmount = updateIncomeDto.amount ?? existingIncome.amount;
      const newCurrency = updateIncomeDto.currency ?? existingIncome.originalCurrency;
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
    if (updateIncomeDto.source !== undefined) {
      updateData.source = updateIncomeDto.source;
    }
    if (updateIncomeDto.description !== undefined) {
      updateData.description = updateIncomeDto.description;
    }
    if (updateIncomeDto.incomeType !== undefined) {
      updateData.incomeType = updateIncomeDto.incomeType;
    }
    if (updateIncomeDto.dateReceived !== undefined) {
      updateData.dateReceived = updateIncomeDto.dateReceived;
    }
    if (updateIncomeDto.createdBy !== undefined) {
      updateData.createdBy = updateIncomeDto.createdBy;
    }

    return this.incomesRepository.update(id, updateData);
  }

  async remove(id: string): Promise<void> {
    return this.incomesRepository.delete(id);
  }
}
