import { Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../firebase/firebase.service';
import { CategoryOverrides, ParsedStatement, StatementArchive } from './interfaces/statement-archive.interface';

/**
 * Full monthly bank statements (every account, balance and row) per household,
 * plus the category corrections made in the reports view.
 */
@Injectable()
export class StatementArchiveRepository {
  private readonly collectionName = 'statementArchives';
  private readonly overridesCollection = 'reportCategoryOverrides';

  constructor(private firebaseService: FirebaseService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseService.getFirestore();
  }

  /** One document per household, account and month - re-uploading a statement replaces it */
  private docId(householdId: string, statement: ParsedStatement): string {
    return `${householdId}_${statement.accounts[0].accountNo}_${statement.period}`;
  }

  async save(
    householdId: string,
    statement: ParsedStatement,
    meta: { uploadedByUid: string; uploadedBy: string; fileName: string | null }
  ): Promise<{ archive: StatementArchive; replaced: boolean }> {
    const ref = this.firestore.collection(this.collectionName).doc(this.docId(householdId, statement));
    const existing = await ref.get();
    const now = admin.firestore.Timestamp.now();

    await ref.set({
      ...statement,
      householdId,
      ...meta,
      createdAt: existing.exists ? existing.data()!.createdAt : now,
      updatedAt: now
    });

    return { archive: this.map(await ref.get()), replaced: existing.exists };
  }

  /** All statements of a household; a household has at most a few dozen, so no paging */
  async findAll(householdId: string): Promise<StatementArchive[]> {
    const snapshot = await this.firestore.collection(this.collectionName).where('householdId', '==', householdId).get();
    return snapshot.docs.map(doc => this.map(doc)).sort((a, b) => a.period.localeCompare(b.period));
  }

  async delete(householdId: string, id: string): Promise<void> {
    const ref = this.firestore.collection(this.collectionName).doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data()!.householdId !== householdId) {
      throw new NotFoundException('Izvod nije pronađen');
    }
    await ref.delete();
  }

  async getOverrides(householdId: string): Promise<CategoryOverrides> {
    const doc = await this.firestore.collection(this.overridesCollection).doc(householdId).get();
    const data = doc.data();
    return { merchants: data?.merchants ?? {}, transactions: data?.transactions ?? {} };
  }

  /** Sets (or with category null removes) one correction */
  async setOverride(householdId: string, scope: keyof CategoryOverrides, key: string, category: string | null): Promise<void> {
    const ref = this.firestore.collection(this.overridesCollection).doc(householdId);
    if (category === null) {
      const doc = await ref.get();
      if (doc.exists) await ref.update(new admin.firestore.FieldPath(scope, key), admin.firestore.FieldValue.delete());
      return;
    }
    await ref.set({ householdId, [scope]: { [key]: category }, updatedAt: admin.firestore.Timestamp.now() }, { merge: true });
  }

  private map(doc: admin.firestore.DocumentSnapshot): StatementArchive {
    const data = doc.data()!;
    return {
      id: doc.id,
      householdId: data.householdId,
      uploadedByUid: data.uploadedByUid,
      uploadedBy: data.uploadedBy,
      fileName: data.fileName ?? null,
      bank: data.bank,
      statementNo: data.statementNo ?? null,
      period: data.period,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      accounts: data.accounts ?? [],
      transactions: data.transactions ?? [],
      createdAt: data.createdAt?.toDate().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString()
    };
  }
}
