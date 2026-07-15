import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../firebase/firebase.service';

export interface LearnedCategory {
  merchant: string;
  category: string;
  count: number;
}

/**
 * Stores per-household "merchant -> category" corrections the user makes, so the
 * app can auto-apply the learned category next time instead of relying on the
 * hard-coded rules or the AI guess.
 */
@Injectable()
export class CategoryLearningRepository {
  private readonly collectionName = 'categoryOverrides';

  constructor(private firebaseService: FirebaseService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseService.getFirestore();
  }

  private docId(householdId: string, normalizedMerchant: string): string {
    // Firestore doc ids may not contain '/', which normalization already removes.
    return `${householdId}__${normalizedMerchant}`.slice(0, 400);
  }

  /** Records (or reinforces) a learned merchant -> category mapping. */
  async record(householdId: string, normalizedMerchant: string, category: string): Promise<void> {
    const ref = this.firestore.collection(this.collectionName).doc(this.docId(householdId, normalizedMerchant));
    const now = admin.firestore.Timestamp.now();
    const existing = await ref.get();

    if (existing.exists) {
      await ref.update({
        category,
        updatedAt: now,
        count: admin.firestore.FieldValue.increment(1)
      });
    } else {
      await ref.set({ householdId, merchant: normalizedMerchant, category, count: 1, createdAt: now, updatedAt: now });
    }
  }

  /** Returns the learned category for a merchant, or null if none. */
  async lookup(householdId: string, normalizedMerchant: string): Promise<string | null> {
    const ref = this.firestore.collection(this.collectionName).doc(this.docId(householdId, normalizedMerchant));
    const doc = await ref.get();
    return doc.exists ? (doc.data()?.category ?? null) : null;
  }

  /** All learned mappings for a household (used to hint the statement parser). */
  async getAll(householdId: string): Promise<LearnedCategory[]> {
    const snapshot = await this.firestore.collection(this.collectionName).where('householdId', '==', householdId).get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { merchant: data.merchant as string, category: data.category as string, count: (data.count as number) ?? 1 };
    });
  }
}
