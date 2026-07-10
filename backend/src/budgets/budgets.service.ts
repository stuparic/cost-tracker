import { Injectable } from '@nestjs/common';
import { BudgetsRepository } from './budgets.repository';
import { Budget } from './interfaces/budget.interface';

@Injectable()
export class BudgetsService {
  constructor(private budgetsRepository: BudgetsRepository) {}

  async findAll(householdId: string): Promise<Budget[]> {
    return this.budgetsRepository.findAll(householdId);
  }

  async setLimit(householdId: string, category: string, monthlyLimit: number): Promise<Budget> {
    return this.budgetsRepository.upsert(householdId, category, monthlyLimit);
  }

  async remove(householdId: string, category: string): Promise<void> {
    return this.budgetsRepository.delete(householdId, category);
  }
}
