export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface CategoryInference {
  category: string;
  confidence: ConfidenceLevel;
  isInferred: boolean;
}

/**
 * Infer expense category from shop name
 * This mirrors the backend logic for instant UI feedback
 */
export function inferCategory(shopName: string): CategoryInference {
  if (!shopName || shopName.trim().length === 0) {
    return {
      category: 'General',
      confidence: 'low',
      isInferred: false
    };
  }

  const shopLower = shopName.toLowerCase().trim();

  // Supermarkets & Grocery Stores (High Confidence)
  if (/(maxi|lidl|mercator|idea|tempo|aman|dis)/i.test(shopLower)) {
    return {
      category: 'Groceries',
      confidence: 'high',
      isInferred: true
    };
  }

  // Furniture & Home Improvement (High Confidence)
  if (/(ikea|jysk|emezeta)/i.test(shopLower)) {
    return {
      category: 'Home',
      confidence: 'high',
      isInferred: true
    };
  }

  // Gas Stations & Transport (High Confidence)
  if (/(nis|petrol|mol|lukoil|omv|parking|taxi|bolt|car)/i.test(shopLower)) {
    return {
      category: 'Transport',
      confidence: 'high',
      isInferred: true
    };
  }

  // Pharmacies & Health (High Confidence)
  if (/(apoteka|pharmacy|lilly|benu|zegin)/i.test(shopLower)) {
    return {
      category: 'Health',
      confidence: 'high',
      isInferred: true
    };
  }

  // Electronics & Technology (Medium Confidence)
  if (/(gigatron|tehnomanija|comtrade|mediamarkt|tech)/i.test(shopLower)) {
    return {
      category: 'Electronics',
      confidence: 'medium',
      isInferred: true
    };
  }

  // Restaurants & Dining (Medium Confidence)
  if (/(restoran|restaurant|cafe|kafana|pizza|burger|mcdon)/i.test(shopLower)) {
    return {
      category: 'Dining',
      confidence: 'medium',
      isInferred: true
    };
  }

  // Clothing & Fashion (Medium Confidence)
  if (/(zara|h&m|mango|new\s*yorker|fashion|clothes)/i.test(shopLower)) {
    return {
      category: 'Clothing',
      confidence: 'medium',
      isInferred: true
    };
  }

  // No match found - default to General
  return {
    category: 'General',
    confidence: 'low',
    isInferred: true
  };
}

/**
 * Get icon class based on confidence level
 */
export function getConfidenceIcon(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case 'high':
      return 'pi pi-check-circle';
    case 'medium':
      return 'pi pi-info-circle';
    case 'low':
      return 'pi pi-question-circle';
  }
}
