import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpenseDraftsRepository } from './expense-drafts.repository';
import { ExpenseDraft } from './interfaces/expense-draft.interface';
import { Expense } from './interfaces/expense.interface';
import { CreateExpenseStatementDto } from './dto/create-expense.dto';

@Injectable()
export class ExpenseDraftsService {
  private readonly logger = new Logger(ExpenseDraftsService.name);

  constructor(
    private readonly draftsRepository: ExpenseDraftsRepository,
    private readonly expensesService: ExpensesService
  ) {}

  async create(data: Omit<ExpenseDraft, 'id' | 'createdAt'>): Promise<ExpenseDraft> {
    return this.draftsRepository.create(data);
  }

  async findMine(uid: string): Promise<ExpenseDraft[]> {
    return this.draftsRepository.findAllByUid(uid);
  }

  async existsByBankRef(bankRef: string): Promise<boolean> {
    return this.draftsRepository.existsByBankRef(bankRef);
  }

  private async getOwnedDraft(id: string, uid: string): Promise<ExpenseDraft> {
    const draft = await this.draftsRepository.findById(id);
    if (draft.createdByUid !== uid) {
      throw new ForbiddenException('Ovaj draft ne pripada tebi');
    }
    return draft;
  }

  /** Promotes a draft into a real expense and removes the draft. */
  async confirm(id: string, uid: string): Promise<Expense> {
    const draft = await this.getOwnedDraft(id, uid);

    const createDto: CreateExpenseStatementDto = {
      amount: draft.amount,
      currency: draft.currency,
      shopName: draft.shopName,
      productDescription: draft.productDescription,
      category: draft.category,
      paymentMethod: draft.paymentMethod,
      tags: draft.tags,
      purchaseDate: draft.purchaseDate,
      createdBy: draft.createdBy,
      bankRef: draft.bankRef || `draft-${draft.id}`,
      creationMethod: 'statement'
    };
    const expense = await this.expensesService.create(createDto, {
      householdId: draft.householdId,
      uid: draft.createdByUid,
      displayName: draft.createdBy
    });
    await this.draftsRepository.delete(id);

    this.logger.log(`Draft ${id} confirmed as expense ${expense.id} (${draft.shopName}, ${draft.amount} ${draft.currency})`);
    return expense;
  }

  /** Confirms every draft belonging to the caller. */
  async confirmAll(uid: string): Promise<{ confirmed: number }> {
    const drafts = await this.draftsRepository.findAllByUid(uid);
    let confirmed = 0;
    for (const draft of drafts) {
      await this.confirm(draft.id, uid);
      confirmed++;
    }
    return { confirmed };
  }

  /** Discards a draft without recording anything. */
  async discard(id: string, uid: string): Promise<void> {
    const draft = await this.getOwnedDraft(id, uid);
    await this.draftsRepository.delete(id);
    this.logger.log(`Draft ${id} discarded (${draft.shopName}, ${draft.amount} ${draft.currency})`);
  }
}
