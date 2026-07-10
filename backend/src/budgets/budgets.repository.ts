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

  async findAll(): Promise<Budget[]> {
    const snapshot = await this.firestore.collection(this.collectionName).get();
    return snapshot.docs.map(doc => this.mapDocToBudget(doc));
  }

  async upsert(category: string, monthlyLimit: number): Promise<Budget> {
    const docRef = this.firestore.collection(this.collectionName).doc(category);
    const existing = await docRef.get();

    const now = admin.firestore.Timestamp.now();

    if (existing.exists) {
      await docRef.update({ monthlyLimit, updatedAt: now });
    } else {
      await docRef.set({ category, monthlyLimit, createdAt: now, updatedAt: now });
    }

    const updated = await docRef.get();
    return this.mapDocToBudget(updated);
  }

  async delete(category: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(category);
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
