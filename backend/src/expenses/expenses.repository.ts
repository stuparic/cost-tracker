import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';
import { Expense } from './interfaces/expense.interface';
import { QueryExpensesDto } from './dto/query-expenses.dto';

@Injectable()
export class ExpensesRepository {
  private readonly collectionName = 'expenses';

  constructor(private firebaseService: FirebaseService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseService.getFirestore();
  }

  async create(expenseData: any): Promise<Expense> {
    const docRef = this.firestore.collection(this.collectionName).doc();

    const firestoreData = {
      ...expenseData,
      purchaseDate: admin.firestore.Timestamp.fromDate(new Date(expenseData.purchaseDate)),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.set(firestoreData);

    const doc = await docRef.get();
    return this.mapDocToExpense(doc);
  }

  async findAll(query: QueryExpensesDto): Promise<{ data: Expense[]; total: number }> {
    let firestoreQuery = this.firestore.collection(this.collectionName);

    // Apply filters
    if (query.category) {
      firestoreQuery = firestoreQuery.where('category', '==', query.category) as any;
    }
    if (query.shopName) {
      firestoreQuery = firestoreQuery.where('shopName', '==', query.shopName) as any;
    }
    if (query.startDate) {
      firestoreQuery = firestoreQuery.where('purchaseDate', '>=', admin.firestore.Timestamp.fromDate(new Date(query.startDate))) as any;
    }
    if (query.endDate) {
      firestoreQuery = firestoreQuery.where('purchaseDate', '<=', admin.firestore.Timestamp.fromDate(new Date(query.endDate))) as any;
    }

    // Apply sorting
    const sortDirection = query.sortOrder === 'asc' ? 'asc' : 'desc';
    firestoreQuery = firestoreQuery.orderBy(query.sortBy || 'purchaseDate', sortDirection) as any;

    // Get total count
    const snapshot = await firestoreQuery.get();
    const total = snapshot.size;

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const paginatedQuery = firestoreQuery.limit(limit).offset(offset);
    const paginatedSnapshot = await paginatedQuery.get();

    const data = paginatedSnapshot.docs.map((doc) => this.mapDocToExpense(doc));

    return { data, total };
  }

  async findById(id: string): Promise<Expense> {
    const doc = await this.firestore.collection(this.collectionName).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return this.mapDocToExpense(doc);
  }

  async update(id: string, updateData: any): Promise<Expense> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    const firestoreData: any = {
      ...updateData,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (updateData.purchaseDate) {
      firestoreData.purchaseDate = admin.firestore.Timestamp.fromDate(new Date(updateData.purchaseDate));
    }

    await docRef.update(firestoreData);

    const updatedDoc = await docRef.get();
    return this.mapDocToExpense(updatedDoc);
  }

  async delete(id: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    await docRef.delete();
  }

  private mapDocToExpense(doc: any): Expense {
    const data = doc.data();
    return {
      id: doc.id,
      amount: data.amount,
      originalCurrency: data.originalCurrency,
      eurAmount: data.eurAmount,
      rsdAmount: data.rsdAmount,
      exchangeRate: data.exchangeRate,
      shopName: data.shopName,
      productDescription: data.productDescription,
      category: data.category,
      paymentMethod: data.paymentMethod,
      tags: data.tags,
      purchaseDate: data.purchaseDate?.toDate().toISOString(),
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString(),
    };
  }
}
