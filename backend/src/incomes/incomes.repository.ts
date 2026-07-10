import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';
import { Income } from './interfaces/income.interface';
import { QueryIncomesDto } from './dto/query-incomes.dto';

@Injectable()
export class IncomesRepository {
  private readonly collectionName = 'incomes';

  constructor(private firebaseService: FirebaseService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseService.getFirestore();
  }

  async create(incomeData: any): Promise<Income> {
    const docRef = this.firestore.collection(this.collectionName).doc();

    const firestoreData = {
      ...incomeData,
      dateReceived: admin.firestore.Timestamp.fromDate(new Date(incomeData.dateReceived)),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    await docRef.set(firestoreData);

    const doc = await docRef.get();
    return this.mapDocToIncome(doc);
  }

  async findAll(query: QueryIncomesDto & { householdId?: string }): Promise<{ data: Income[]; total: number }> {
    let firestoreQuery = this.firestore.collection(this.collectionName);

    // Apply filters
    if (query.householdId) {
      firestoreQuery = firestoreQuery.where('householdId', '==', query.householdId) as any;
    }
    if (query.incomeType) {
      firestoreQuery = firestoreQuery.where('incomeType', '==', query.incomeType) as any;
    }
    if (query.source) {
      firestoreQuery = firestoreQuery.where('source', '==', query.source) as any;
    }
    if (query.createdBy) {
      firestoreQuery = firestoreQuery.where('createdBy', '==', query.createdBy) as any;
    }
    if (query.startDate) {
      firestoreQuery = firestoreQuery.where('dateReceived', '>=', admin.firestore.Timestamp.fromDate(new Date(query.startDate))) as any;
    }
    if (query.endDate) {
      firestoreQuery = firestoreQuery.where('dateReceived', '<=', admin.firestore.Timestamp.fromDate(new Date(query.endDate))) as any;
    }

    // Apply sorting
    const sortDirection = query.sortOrder === 'asc' ? 'asc' : 'desc';
    firestoreQuery = firestoreQuery.orderBy(query.sortBy || 'dateReceived', sortDirection) as any;

    // Get total count
    const snapshot = await firestoreQuery.get();
    const total = snapshot.size;

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const paginatedQuery = firestoreQuery.limit(limit).offset(offset);
    const paginatedSnapshot = await paginatedQuery.get();

    const data = paginatedSnapshot.docs.map(doc => this.mapDocToIncome(doc));

    return { data, total };
  }

  async existsByBankRef(bankRef: string, householdId?: string): Promise<boolean> {
    let query = this.firestore.collection(this.collectionName).where('bankRef', '==', bankRef) as any;
    if (householdId) {
      query = query.where('householdId', '==', householdId);
    }
    const snapshot = await query.limit(1).get();
    return !snapshot.empty;
  }

  /**
   * Fetches every income matching the given filters, without pagination.
   * Used for exports — callers are responsible for keeping result sets reasonably sized.
   */
  async findAllForExport(filters: {
    incomeType?: string;
    source?: string;
    createdBy?: string;
    startDate?: string;
    endDate?: string;
    householdId?: string;
  }): Promise<Income[]> {
    let firestoreQuery = this.firestore.collection(this.collectionName);

    if (filters.householdId) {
      firestoreQuery = firestoreQuery.where('householdId', '==', filters.householdId) as any;
    }
    if (filters.incomeType) {
      firestoreQuery = firestoreQuery.where('incomeType', '==', filters.incomeType) as any;
    }
    if (filters.source) {
      firestoreQuery = firestoreQuery.where('source', '==', filters.source) as any;
    }
    if (filters.createdBy) {
      firestoreQuery = firestoreQuery.where('createdBy', '==', filters.createdBy) as any;
    }
    if (filters.startDate) {
      firestoreQuery = firestoreQuery.where('dateReceived', '>=', admin.firestore.Timestamp.fromDate(new Date(filters.startDate))) as any;
    }
    if (filters.endDate) {
      firestoreQuery = firestoreQuery.where('dateReceived', '<=', admin.firestore.Timestamp.fromDate(new Date(filters.endDate))) as any;
    }

    firestoreQuery = firestoreQuery.orderBy('dateReceived', 'desc') as any;

    const snapshot = await firestoreQuery.get();
    return snapshot.docs.map(doc => this.mapDocToIncome(doc));
  }

  async findById(id: string): Promise<Income> {
    const doc = await this.firestore.collection(this.collectionName).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Income with ID ${id} not found`);
    }

    return this.mapDocToIncome(doc);
  }

  async update(id: string, updateData: any): Promise<Income> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Income with ID ${id} not found`);
    }

    const firestoreData: any = {
      ...updateData,
      updatedAt: admin.firestore.Timestamp.now()
    };

    if (updateData.dateReceived) {
      firestoreData.dateReceived = admin.firestore.Timestamp.fromDate(new Date(updateData.dateReceived));
    }

    await docRef.update(firestoreData);

    const updatedDoc = await docRef.get();
    return this.mapDocToIncome(updatedDoc);
  }

  async delete(id: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Income with ID ${id} not found`);
    }

    await docRef.delete();
  }

  private mapDocToIncome(doc: any): Income {
    const data = doc.data();
    return {
      id: doc.id,
      amount: data.amount,
      originalCurrency: data.originalCurrency,
      eurAmount: data.eurAmount,
      rsdAmount: data.rsdAmount,
      exchangeRate: data.exchangeRate,
      source: data.source,
      description: data.description,
      incomeType: data.incomeType,
      dateReceived: data.dateReceived?.toDate().toISOString(),
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString(),
      creationMethod: data.creationMethod,
      voiceTranscript: data.voiceTranscript,
      recurringOccurrenceId: data.recurringOccurrenceId,
      bankRef: data.bankRef,
      householdId: data.householdId,
      createdByUid: data.createdByUid
    };
  }
}
