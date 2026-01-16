// Expense Categories
export const EXPENSE_CATEGORIES = [
  'Groceries',
  'Home',
  'Transport',
  'Health',
  'Electronics',
  'Dining',
  'Clothing',
  'Entertainment',
  'Utilities',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  Groceries: 'Namirnice',
  Home: 'Dom',
  Transport: 'Prevoz',
  Health: 'Zdravlje',
  Electronics: 'Elektronika',
  Dining: 'Restorani',
  Clothing: 'Odeća',
  Entertainment: 'Zabava',
  Utilities: 'Režije',
  Other: 'Ostalo',
};

// Income Types
export const INCOME_TYPES = [
  'Salary',
  'Freelance',
  'Rent',
  'Investment',
  'Gift',
  'Other',
] as const;

export type IncomeType = (typeof INCOME_TYPES)[number];

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  Salary: 'Plata',
  Freelance: 'Honorar',
  Rent: 'Zakup',
  Investment: 'Investicija',
  Gift: 'Poklon',
  Other: 'Ostalo',
};