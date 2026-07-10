import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';
import { Budget } from './interfaces/budget.interface';

@Injectable()
export class BudgetsRepository {
  private readonly collectionName = 'budgets';

  constructor(private firebaseService: FirebaseService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseService.getFirestore();
  }

  private docId(householdId: string, category: string): string {
    return `${householdId}_${category}`;
  }

  async findAll(householdId: string): Promise<Budget[]> {
    const snapshot = await this.firestore.collection(this.collectionName).where('householdId', '==', householdId).get();
    return snapshot.docs.map(doc => this.mapDocToBudget(doc));
  }

  async upsert(householdId: string, category: string, monthlyLimit: number): Promise<Budget> {
    const docRef = this.firestore.collection(this.collectionName).doc(this.docId(householdId, category));
    const existing = await docRef.get();

    const now = admin.firestore.Timestamp.now();

    if (existing.exists) {
      await docRef.update({ monthlyLimit, updatedAt: now });
    } else {
      await docRef.set({ category, householdId, monthlyLimit, createdAt: now, updatedAt: now });
    }

    const updated = await docRef.get();
    return this.mapDocToBudget(updated);
  }

  async delete(householdId: string, category: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(this.docId(householdId, category));
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Budget for category "${category}" not found`);
    }

    await docRef.delete();
  }

  private mapDocToBudget(doc: admin.firestore.DocumentSnapshot): Budget {
    const data = doc.data()!;
    return {
      category: data.category,
      monthlyLimit: data.monthlyLimit,
      createdAt: data.createdAt?.toDate().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString()
    };
  }
}
