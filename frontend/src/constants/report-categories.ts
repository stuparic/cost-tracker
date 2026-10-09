// Categories of the statement reports (backend/src/reports/report-categories.ts)

import type { InsightSeverity, SpendingGroup } from '@/types/report';

export interface ReportCategoryOption {
  value: string;
  label: string;
  icon: string;
  group?: SpendingGroup;
}

export const SPENDING_CATEGORY_OPTIONS: ReportCategoryOption[] = [
  { value: 'HomeLoan', label: 'Stambeni kredit', icon: 'pi pi-home', group: 'fixed' },
  { value: 'CarLoan', label: 'Auto kredit', icon: 'pi pi-car', group: 'fixed' },
  { value: 'Utilities', label: 'Režije', icon: 'pi pi-bolt', group: 'fixed' },
  { value: 'Insurance', label: 'Osiguranje', icon: 'pi pi-shield', group: 'fixed' },
  { value: 'Subscriptions', label: 'Pretplate', icon: 'pi pi-replay', group: 'fixed' },
  { value: 'Work', label: 'Posao', icon: 'pi pi-briefcase', group: 'fixed' },
  { value: 'Charity', label: 'Humanitarno', icon: 'pi pi-heart-fill', group: 'fixed' },
  { value: 'Taxes', label: 'Porezi i takse', icon: 'pi pi-building-columns', group: 'fixed' },
  { value: 'BankFees', label: 'Bankarske naknade', icon: 'pi pi-percentage', group: 'fixed' },
  { value: 'Groceries', label: 'Namirnice', icon: 'pi pi-shopping-cart', group: 'variable' },
  { value: 'Dining', label: 'Restorani i kafići', icon: 'pi pi-shopping-bag', group: 'variable' },
  { value: 'Transport', label: 'Gorivo i prevoz', icon: 'pi pi-car', group: 'variable' },
  { value: 'Health', label: 'Zdravlje', icon: 'pi pi-heart', group: 'variable' },
  { value: 'Shopping', label: 'Kupovina', icon: 'pi pi-tag', group: 'variable' },
  { value: 'Fun', label: 'Zabava', icon: 'pi pi-ticket', group: 'variable' },
  { value: 'Games', label: 'Igrice i aplikacije', icon: 'pi pi-mobile', group: 'variable' },
  { value: 'Travel', label: 'Putovanja', icon: 'pi pi-globe', group: 'variable' },
  { value: 'People', label: 'Uplate osobama', icon: 'pi pi-user', group: 'variable' },
  { value: 'Other', label: 'Ostalo', icon: 'pi pi-circle', group: 'variable' },
  { value: 'Cash', label: 'Gotovina (podignuto)', icon: 'pi pi-money-bill', group: 'cash' }
];

export const INCOME_CATEGORY_OPTIONS: ReportCategoryOption[] = [
  { value: 'Salary', label: 'Plata', icon: 'pi pi-wallet' },
  { value: 'Rent', label: 'Kirija', icon: 'pi pi-key' },
  { value: 'Cashback', label: 'Keš-bek', icon: 'pi pi-gift' },
  { value: 'Interest', label: 'Kamata', icon: 'pi pi-chart-line' },
  { value: 'OwnAccount', label: 'Sa drugog računa', icon: 'pi pi-arrow-right-arrow-left' },
  { value: 'CashDeposit', label: 'Uplaćena gotovina', icon: 'pi pi-money-bill' },
  { value: 'OtherIncome', label: 'Ostali prilivi', icon: 'pi pi-circle' }
];

/** "Money moved to/from my own account elsewhere" - neither income nor spending */
export const TRANSFER_OPTION: ReportCategoryOption = {
  value: 'Transfer',
  label: 'Prenos na/sa mog drugog računa',
  icon: 'pi pi-arrow-right-arrow-left'
};

const ALL_OPTIONS = [...SPENDING_CATEGORY_OPTIONS, ...INCOME_CATEGORY_OPTIONS, TRANSFER_OPTION];

export interface ReportCategoryGroup {
  label: string;
  items: ReportCategoryOption[];
}

/** Grouped choices for a correction: money out can only be spending (or a transfer), money in can also be income */
export function categoryOptionGroups(direction: 'debit' | 'credit'): ReportCategoryGroup[] {
  const groups = [
    { label: 'Fiksni troškovi', items: SPENDING_CATEGORY_OPTIONS.filter(option => option.group === 'fixed') },
    { label: 'Promenljivi troškovi', items: SPENDING_CATEGORY_OPTIONS.filter(option => option.group !== 'fixed') },
    { label: 'Ostalo', items: [TRANSFER_OPTION] }
  ];
  if (direction === 'credit') groups.unshift({ label: 'Prilivi', items: INCOME_CATEGORY_OPTIONS });
  return groups;
}

export function reportCategoryLabel(category: string | null): string {
  if (!category) return 'Interno';
  return ALL_OPTIONS.find(option => option.value === category)?.label ?? category;
}

export function reportCategoryIcon(category: string | null): string {
  return ALL_OPTIONS.find(option => option.value === category)?.icon ?? 'pi pi-circle';
}

export const SEVERITY_META: Record<InsightSeverity, { label: string; icon: string }> = {
  high: { label: 'Važno', icon: 'pi pi-exclamation-triangle' },
  medium: { label: 'Obrati pažnju', icon: 'pi pi-exclamation-circle' },
  low: { label: 'Savet', icon: 'pi pi-lightbulb' },
  positive: { label: 'Dobro', icon: 'pi pi-check-circle' }
};
