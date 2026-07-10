import { Injectable } from '@nestjs/common';
import { CurrencyService } from '../currency/currency.service';
import { IncomesRepository } from './incomes.repository';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { QueryIncomesDto } from './dto/query-incomes.dto';
import { ExportIncomesDto } from './dto/export-incomes.dto';
import { Income } from './interfaces/income.interface';
import { Pagination } from '../common/interfaces/pagination.interface';
import { normalizeCreatedBy } from '../common/utils/normalize-created-by';
import { HouseholdContext } from '../common/interfaces/household-context.interface';
import { ForbiddenException } from '@nestjs/common';
import { toCsv } from '../common/utils/csv.util';

@Injectable()
export class IncomesService {
  constructor(
    private currencyService: CurrencyService,
    private incomesRepository: IncomesRepository
  ) {}

  async create(createIncomeDto: CreateIncomeDto, ctx?: HouseholdContext): Promise<Income> {
    const { eurAmount, rsdAmount, exchangeRate } = this.currencyService.convertAmount(createIncomeDto.amount, createIncomeDto.currency);

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
      createdBy: normalizeCreatedBy(createIncomeDto.createdBy),
      creationMethod: createIncomeDto.creationMethod || 'manual',
      voiceTranscript: createIncomeDto.voiceTranscript,
      recurringOccurrenceId: createIncomeDto.recurringOccurrenceId,
      bankRef: createIncomeDto.bankRef
    };

    return this.incomesRepository.create(incomeData);
  }

  async existsByBankRef(bankRef: string, householdId?: string): Promise<boolean> {
    return this.incomesRepository.existsByBankRef(bankRef, householdId);
  }

  private assertSameHousehold(income: Income, ctx?: HouseholdContext): void {
    if (ctx && income.householdId && income.householdId !== ctx.householdId) {
      throw new ForbiddenException('Ova stavka ne pripada tvom domaćinstvu');
    }
  }

  async findAll(query: QueryIncomesDto, ctx?: HouseholdContext): Promise<{ data: Income[]; pagination: Pagination }> {
    const { data, total } = await this.incomesRepository.findAll({ ...query, householdId: ctx?.householdId });

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
      total,
      totalPages: Math.ceil(total / (query.limit || 20))
    };

    return { data, pagination };
  }

  async findOne(id: string, ctx?: HouseholdContext): Promise<Income> {
    const income = await this.incomesRepository.findById(id);
    this.assertSameHousehold(income, ctx);
    return income;
  }

  async update(id: string, updateIncomeDto: UpdateIncomeDto, ctx?: HouseholdContext): Promise<Income> {
    const existingIncome = await this.incomesRepository.findById(id);
    this.assertSameHousehold(existingIncome, ctx);

    const updateData: any = {};

    // Check if amount or currency changed, recalculate both currencies
    if (updateIncomeDto.amount !== undefined || updateIncomeDto.currency !== undefined) {
      const newAmount = updateIncomeDto.amount ?? existingIncome.amount;
      const newCurrency = updateIncomeDto.currency ?? existingIncome.originalCurrency;

      const { eurAmount, rsdAmount, exchangeRate } = this.currencyService.convertAmount(newAmount, newCurrency);

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

  async remove(id: string, ctx?: HouseholdContext): Promise<void> {
    const existing = await this.incomesRepository.findById(id);
    this.assertSameHousehold(existing, ctx);
    return this.incomesRepository.delete(id);
  }

  /**
   * Returns every income, unfiltered. Used for the full JSON backup.
   */
  async exportAll(ctx?: HouseholdContext): Promise<Income[]> {
    return this.incomesRepository.findAllForExport({ householdId: ctx?.householdId });
  }

  async exportCsv(query: ExportIncomesDto, ctx?: HouseholdContext): Promise<string> {
    const incomes = await this.incomesRepository.findAllForExport({ ...query, householdId: ctx?.householdId });

    return toCsv(incomes, [
      { header: 'Datum', value: i => i.dateReceived?.slice(0, 10) },
      { header: 'Izvor', value: i => i.source },
      { header: 'Opis', value: i => i.description },
      { header: 'Tip', value: i => i.incomeType },
      { header: 'Iznos', value: i => i.amount },
      { header: 'Valuta', value: i => i.originalCurrency },
      { header: 'Iznos (EUR)', value: i => i.eurAmount },
      { header: 'Iznos (RSD)', value: i => i.rsdAmount },
      { header: 'Osoba', value: i => i.createdBy }
    ]);
  }
}
