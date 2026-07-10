import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';
import { ExpenseDraft } from './interfaces/expense-draft.interface';

type CreateDraftData = Omit<ExpenseDraft, 'id' | 'createdAt'>;

/**
 * Pending (draft) expenses live in their own collection so they never show up
 * in expense queries, lists, or balance stats until the owner confirms them.
 */
@Injectable()
export class ExpenseDraftsRepository {
  private readonly collectionName = 'expenseDrafts';

  constructor(private firebaseService: FirebaseService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseService.getFirestore();
  }

  async create(data: CreateDraftData): Promise<ExpenseDraft> {
    const docRef = this.firestore.collection(this.collectionName).doc();
    await docRef.set({
      ...data,
      purchaseDate: admin.firestore.Timestamp.fromDate(new Date(data.purchaseDate)),
      createdAt: admin.firestore.Timestamp.now()
    });
    const doc = await docRef.get();
    return this.mapDoc(doc);
  }

  /** Only the owner's drafts - privacy is the whole point of this collection */
  async findAllByUid(uid: string): Promise<ExpenseDraft[]> {
    const snapshot = await this.firestore.collection(this.collectionName).where('createdByUid', '==', uid).get();
    return snapshot.docs.map(doc => this.mapDoc(doc)).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }

  async findById(id: string): Promise<ExpenseDraft> {
    const doc = await this.firestore.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Draft with id ${id} not found`);
    }
    return this.mapDoc(doc);
  }

  async delete(id: string): Promise<void> {
    await this.firestore.collection(this.collectionName).doc(id).delete();
  }

  async existsByBankRef(bankRef: string): Promise<boolean> {
    const snapshot = await this.firestore.collection(this.collectionName).where('bankRef', '==', bankRef).limit(1).get();
    return !snapshot.empty;
  }

  private mapDoc(doc: admin.firestore.DocumentSnapshot): ExpenseDraft {
    const data = doc.data()!;
    return {
      id: doc.id,
      amount: data.amount,
      currency: data.currency,
      shopName: data.shopName,
      productDescription: data.productDescription,
      category: data.category,
      paymentMethod: data.paymentMethod,
      tags: data.tags || [],
      purchaseDate: data.purchaseDate?.toDate?.()?.toISOString?.() ?? data.purchaseDate,
      createdBy: data.createdBy,
      createdByUid: data.createdByUid,
      householdId: data.householdId,
      bankRef: data.bankRef,
      creationMethod: data.creationMethod,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt
    };
  }
}
