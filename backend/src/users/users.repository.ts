import { Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../firebase/firebase.service';
import { Household, UserProfile } from './interfaces/user.interface';

@Injectable()
export class UsersRepository {
  private readonly usersCollection = 'users';
  private readonly householdsCollection = 'households';
  /** Tiny TTL cache so the global auth guard doesn't hit Firestore on every request */
  private readonly cache = new Map<string, { user: UserProfile; expires: number }>();
  private readonly cacheTtlMs = 60_000;

  constructor(private firebaseService: FirebaseService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseService.getFirestore();
  }

  async findUser(uid: string): Promise<UserProfile | null> {
    const doc = await this.firestore.collection(this.usersCollection).doc(uid).get();
    return doc.exists ? this.mapUser(doc) : null;
  }

  async findUserCached(uid: string): Promise<UserProfile | null> {
    const hit = this.cache.get(uid);
    if (hit && hit.expires > Date.now()) return hit.user;
    const user = await this.findUser(uid);
    if (user) this.cache.set(uid, { user, expires: Date.now() + this.cacheTtlMs });
    return user;
  }

  invalidateCache(uid: string): void {
    this.cache.delete(uid);
  }

  async findUserByWebhookToken(token: string): Promise<UserProfile | null> {
    const snapshot = await this.firestore.collection(this.usersCollection).where('webhookToken', '==', token).limit(1).get();
    return snapshot.empty ? null : this.mapUser(snapshot.docs[0]);
  }

  async findUserByEmail(email: string): Promise<UserProfile | null> {
    const snapshot = await this.firestore.collection(this.usersCollection).where('email', '==', email).limit(1).get();
    return snapshot.empty ? null : this.mapUser(snapshot.docs[0]);
  }

  async setWebhookToken(uid: string, webhookToken: string): Promise<void> {
    await this.firestore.collection(this.usersCollection).doc(uid).update({ webhookToken });
    this.invalidateCache(uid);
  }

  async findUsers(uids: string[]): Promise<UserProfile[]> {
    if (uids.length === 0) return [];
    const docs = await Promise.all(uids.map(uid => this.firestore.collection(this.usersCollection).doc(uid).get()));
    return docs.filter(doc => doc.exists).map(doc => this.mapUser(doc));
  }

  async saveUser(uid: string, data: Omit<UserProfile, 'uid' | 'createdAt'>): Promise<UserProfile> {
    const ref = this.firestore.collection(this.usersCollection).doc(uid);
    await ref.set({ ...data, createdAt: admin.firestore.Timestamp.now() }, { merge: true });
    const doc = await ref.get();
    return this.mapUser(doc);
  }

  async updateUserHousehold(uid: string, householdId: string): Promise<void> {
    await this.firestore.collection(this.usersCollection).doc(uid).update({ householdId });
    this.invalidateCache(uid);
  }

  async createHousehold(name: string, ownerUid: string, inviteCode: string): Promise<Household> {
    const ref = this.firestore.collection(this.householdsCollection).doc();
    await ref.set({
      name,
      memberUids: [ownerUid],
      inviteCode,
      createdAt: admin.firestore.Timestamp.now()
    });
    const doc = await ref.get();
    return this.mapHousehold(doc);
  }

  async findHousehold(id: string): Promise<Household> {
    const doc = await this.firestore.collection(this.householdsCollection).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Household ${id} not found`);
    }
    return this.mapHousehold(doc);
  }

  async findHouseholdByInviteCode(inviteCode: string): Promise<Household | null> {
    const snapshot = await this.firestore.collection(this.householdsCollection).where('inviteCode', '==', inviteCode).limit(1).get();
    if (snapshot.empty) return null;
    return this.mapHousehold(snapshot.docs[0]);
  }

  async addMember(householdId: string, uid: string): Promise<void> {
    await this.firestore
      .collection(this.householdsCollection)
      .doc(householdId)
      .update({ memberUids: admin.firestore.FieldValue.arrayUnion(uid) });
  }

  async removeMember(householdId: string, uid: string): Promise<void> {
    await this.firestore
      .collection(this.householdsCollection)
      .doc(householdId)
      .update({ memberUids: admin.firestore.FieldValue.arrayRemove(uid) });
  }

  async deleteHousehold(id: string): Promise<void> {
    await this.firestore.collection(this.householdsCollection).doc(id).delete();
  }

  async setInviteCode(householdId: string, inviteCode: string): Promise<void> {
    await this.firestore.collection(this.householdsCollection).doc(householdId).update({ inviteCode });
  }

  private mapUser(doc: admin.firestore.DocumentSnapshot): UserProfile {
    const data = doc.data()!;
    return {
      uid: doc.id,
      displayName: data.displayName,
      email: data.email,
      photoURL: data.photoURL,
      householdId: data.householdId,
      // Must be mapped: getOrCreateMe regenerates the token whenever it sees a
      // missing one, so omitting it here caused a brand-new webhookToken on every
      // /me call (breaking the MacroDroid webhook every time the app loaded).
      webhookToken: data.webhookToken,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt
    };
  }

  private mapHousehold(doc: admin.firestore.DocumentSnapshot): Household {
    const data = doc.data()!;
    return {
      id: doc.id,
      name: data.name,
      memberUids: data.memberUids || [],
      inviteCode: data.inviteCode,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt
    };
  }
}
