/**
 * A pending expense captured automatically (e.g. from a payment notification)
 * that stays invisible to all lists and stats until its owner confirms it.
 * Drafts are strictly per-member: only the owner (createdByUid) can see them.
 */
export interface ExpenseDraft {
  id: string;
  amount: number;
  currency: 'EUR' | 'RSD';
  shopName: string;
  productDescription?: string;
  category?: string;
  paymentMethod?: string;
  tags?: string[];
  /** ISO date */
  purchaseDate: string;
  createdBy: string;
  createdByUid: string;
  householdId: string;
  /** Stable reference used for idempotency (e.g. "notif-<hash>") */
  bankRef?: string;
  creationMethod?: string;
  createdAt: string;
}
