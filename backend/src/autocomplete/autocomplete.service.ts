import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';

export interface SuggestionItem {
  value: string;
  count: number;
}

@Injectable()
export class AutocompleteService {
  private readonly collectionName = 'expenses';

  constructor(private firebaseService: FirebaseService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseService.getFirestore();
  }

  getShops(search?: string, householdId?: string): Promise<SuggestionItem[]> {
    return this.getFieldSuggestions(data => data.shopName, search, householdId);
  }

  getProducts(search?: string, householdId?: string): Promise<SuggestionItem[]> {
    return this.getFieldSuggestions(data => data.productDescription, search, householdId);
  }

  getCategories(search?: string, householdId?: string): Promise<SuggestionItem[]> {
    return this.getFieldSuggestions(data => data.category, search, householdId);
  }

  getTags(search?: string, householdId?: string): Promise<SuggestionItem[]> {
    return this.getFieldSuggestions(data => (Array.isArray(data.tags) ? data.tags : []), search, householdId);
  }

  /**
   * Counts occurrences of the extracted field value(s) across all expense
   * documents, optionally filters by a case-insensitive substring, and sorts
   * by frequency (descending) then alphabetically.
   */
  private async getFieldSuggestions(
    extract: (data: admin.firestore.DocumentData) => string | string[] | undefined,
    search?: string,
    householdId?: string
  ): Promise<SuggestionItem[]> {
    const base = this.firestore.collection(this.collectionName);
    const snapshot = householdId ? await base.where('householdId', '==', householdId).get() : await base.get();

    const counts = new Map<string, number>();
    snapshot.docs.forEach(doc => {
      const extracted = extract(doc.data());
      const values = Array.isArray(extracted) ? extracted : [extracted];
      values.forEach(value => {
        if (value) {
          counts.set(value, (counts.get(value) || 0) + 1);
        }
      });
    });

    let suggestions = Array.from(counts.entries()).map(([value, count]) => ({
      value,
      count
    }));

    if (search) {
      const searchLower = search.toLowerCase();
      suggestions = suggestions.filter(item => item.value.toLowerCase().includes(searchLower));
    }

    suggestions.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.value.localeCompare(b.value);
    });

    return suggestions;
  }
}
