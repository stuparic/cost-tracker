import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';
import { RecurringOccurrence } from './interfaces/recurring-occurrence.interface';
import { CreateRecurringOccurrenceDto } from './dto/create-recurring-occurrence.dto';

@Injectable()
export class RecurringOccurrencesRepository {
  private readonly collectionName = 'recurring_occurrences';

  constructor(private firebaseService: FirebaseService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseService.getFirestore();
  }

  async create(dto: CreateRecurringOccurrenceDto): Promise<RecurringOccurrence> {
    const docRef = this.firestore.collection(this.collectionName).doc();

    const occurrence: Omit<RecurringOccurrence, 'id'> = {
      occurrenceType: dto.occurrenceType as 'income' | 'expense',
      amount: dto.amount,
      originalCurrency: dto.currency as 'EUR' | 'RSD',
      description: dto.description || '',
      createdBy: dto.createdBy,

      // Income fields
      source: dto.source,
      incomeType: dto.incomeType,

      // Expense fields
      expenseCategory: dto.expenseCategory,
      store: dto.store,

      // Recurrence
      frequency: dto.frequency as any,
      recurringAt: dto.recurringAt,
      recurringUntil: dto.recurringUntil,
      nextOccurrenceDate: dto.startDate,

      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(occurrence);
    return { id: docRef.id, ...occurrence };
  }

  async findDueOccurrences(beforeDate: string): Promise<RecurringOccurrence[]> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('isActive', '==', true)
      .where('nextOccurrenceDate', '<=', beforeDate)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as RecurringOccurrence));
  }

  async update(id: string, updates: Partial<RecurringOccurrence>): Promise<void> {
    await this.firestore
      .collection(this.collectionName)
      .doc(id)
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
  }

  async findAll(userId: string): Promise<RecurringOccurrence[]> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('createdBy', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as RecurringOccurrence));
  }

  async findById(id: string): Promise<RecurringOccurrence | null> {
    const doc = await this.firestore
      .collection(this.collectionName)
      .doc(id)
      .get();

    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as RecurringOccurrence;
  }

  async delete(id: string): Promise<void> {
    await this.firestore.collection(this.collectionName).doc(id).delete();
  }
}
