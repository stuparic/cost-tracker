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

  async getShops(search?: string): Promise<SuggestionItem[]> {
    const snapshot = await this.firestore.collection(this.collectionName).get();

    const shopCounts = new Map<string, number>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const shopName = data.shopName;
      if (shopName) {
        shopCounts.set(shopName, (shopCounts.get(shopName) || 0) + 1);
      }
    });

    let suggestions = Array.from(shopCounts.entries()).map(([value, count]) => ({
      value,
      count,
    }));

    // Filter by search prefix if provided
    if (search) {
      const searchLower = search.toLowerCase();
      suggestions = suggestions.filter(item => item.value.toLowerCase().includes(searchLower));
    }

    // Sort by count (descending), then alphabetically
    suggestions.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.value.localeCompare(b.value);
    });

    return suggestions;
  }

  async getProducts(search?: string): Promise<SuggestionItem[]> {
    const snapshot = await this.firestore.collection(this.collectionName).get();

    const productCounts = new Map<string, number>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const productDescription = data.productDescription;
      if (productDescription) {
        productCounts.set(productDescription, (productCounts.get(productDescription) || 0) + 1);
      }
    });

    let suggestions = Array.from(productCounts.entries()).map(([value, count]) => ({
      value,
      count,
    }));

    // Filter by search prefix if provided
    if (search) {
      const searchLower = search.toLowerCase();
      suggestions = suggestions.filter(item => item.value.toLowerCase().includes(searchLower));
    }

    // Sort by count (descending), then alphabetically
    suggestions.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.value.localeCompare(b.value);
    });

    return suggestions;
  }

  async getCategories(search?: string): Promise<SuggestionItem[]> {
    const snapshot = await this.firestore.collection(this.collectionName).get();

    const categoryCounts = new Map<string, number>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const category = data.category;
      if (category) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    });

    let suggestions = Array.from(categoryCounts.entries()).map(([value, count]) => ({
      value,
      count,
    }));

    // Filter by search prefix if provided
    if (search) {
      const searchLower = search.toLowerCase();
      suggestions = suggestions.filter(item => item.value.toLowerCase().includes(searchLower));
    }

    // Sort by count (descending), then alphabetically
    suggestions.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.value.localeCompare(b.value);
    });

    return suggestions;
  }

  async getTags(search?: string): Promise<SuggestionItem[]> {
    const snapshot = await this.firestore.collection(this.collectionName).get();

    const tagCounts = new Map<string, number>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const tags = data.tags;
      if (tags && Array.isArray(tags)) {
        tags.forEach(tag => {
          if (tag) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        });
      }
    });

    let suggestions = Array.from(tagCounts.entries()).map(([value, count]) => ({
      value,
      count,
    }));

    // Filter by search prefix if provided
    if (search) {
      const searchLower = search.toLowerCase();
      suggestions = suggestions.filter(item => item.value.toLowerCase().includes(searchLower));
    }

    // Sort by count (descending), then alphabetically
    suggestions.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.value.localeCompare(b.value);
    });

    return suggestions;
  }
}
