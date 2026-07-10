import { Injectable } from '@nestjs/common';
import { BudgetsRepository } from './budgets.repository';
import { Budget } from './interfaces/budget.interface';

@Injectable()
export class BudgetsService {
  constructor(private budgetsRepository: BudgetsRepository) {}

  async findAll(): Promise<Budget[]> {
    return this.budgetsRepository.findAll();
  }

  async setLimit(category: string, monthlyLimit: number): Promise<Budget> {
    return this.budgetsRepository.upsert(category, monthlyLimit);
  }

  async remove(category: string): Promise<void> {
    return this.budgetsRepository.delete(category);
  }
}
