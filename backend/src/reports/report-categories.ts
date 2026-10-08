/**
 * Categories used by the statement reports. They are deliberately more
 * fine-grained than the expense categories (loans split, cash and
 * subscriptions separate) because the point of the reports is to show where
 * the money goes and what can be cut.
 */

export type SpendingGroup = 'fixed' | 'variable' | 'cash';

export interface SpendingCategoryDef {
  label: string;
  group: SpendingGroup;
}

export const SPENDING_CATEGORIES = {
  HomeLoan: { label: 'Stambeni kredit', group: 'fixed' },
  CarLoan: { label: 'Auto kredit', group: 'fixed' },
  Utilities: { label: 'Režije', group: 'fixed' },
  Insurance: { label: 'Osiguranje', group: 'fixed' },
  Subscriptions: { label: 'Pretplate', group: 'fixed' },
  Work: { label: 'Posao', group: 'fixed' },
  Charity: { label: 'Humanitarno', group: 'fixed' },
  Taxes: { label: 'Porezi i takse', group: 'fixed' },
  BankFees: { label: 'Bankarske naknade', group: 'fixed' },
  Groceries: { label: 'Namirnice', group: 'variable' },
  Dining: { label: 'Restorani i kafići', group: 'variable' },
  Transport: { label: 'Gorivo i prevoz', group: 'variable' },
  Health: { label: 'Zdravlje', group: 'variable' },
  Shopping: { label: 'Kupovina', group: 'variable' },
  Fun: { label: 'Zabava', group: 'variable' },
  Games: { label: 'Igrice i aplikacije', group: 'variable' },
  Travel: { label: 'Putovanja', group: 'variable' },
  People: { label: 'Uplate osobama', group: 'variable' },
  Other: { label: 'Ostalo', group: 'variable' },
  Cash: { label: 'Gotovina (podignuto)', group: 'cash' }
} satisfies Record<string, SpendingCategoryDef>;

export type SpendingCategory = keyof typeof SPENDING_CATEGORIES;

export const INCOME_CATEGORIES = {
  Salary: 'Plata',
  Rent: 'Kirija',
  Cashback: 'Keš-bek',
  Interest: 'Kamata',
  OtherIncome: 'Ostali prilivi',
  /** Money moved in from the household's own account at another bank */
  OwnAccount: 'Sa drugog računa',
  /** Cash put (back) into the account at an ATM */
  CashDeposit: 'Uplaćena gotovina'
} as const;

export type IncomeCategory = keyof typeof INCOME_CATEGORIES;

export const GROUP_LABELS: Record<SpendingGroup, string> = {
  fixed: 'Fiksni troškovi',
  variable: 'Promenljivi troškovi',
  cash: 'Gotovina'
};

/**
 * How a statement row affects the household's money:
 * - income / expense: real money in / out
 * - internal: between the household's own Yettel accounts (savings <-> current, RSD <-> EUR)
 * - transfer_in / transfer_out: to/from the household's own account at another bank
 * - cash_deposit: cash put back into the account at an ATM
 */
export type TransactionFlow = 'income' | 'expense' | 'internal' | 'transfer_in' | 'transfer_out' | 'cash_deposit';

export function isSpendingCategory(category: string): category is SpendingCategory {
  return Object.prototype.hasOwnProperty.call(SPENDING_CATEGORIES, category);
}

export function categoryLabel(category: string): string {
  if (isSpendingCategory(category)) return SPENDING_CATEGORIES[category].label;
  return INCOME_CATEGORIES[category as IncomeCategory] ?? category;
}
