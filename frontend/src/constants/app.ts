import type { Currency } from '@/types/expense';

export const USERS = [
  { label: 'Svetla', value: 'Svetla', color: '#7f77dd', colorHover: '#534ab7', bgHover: '#eeedfe' },
  { label: 'Dejan', value: 'Dejan', color: '#1d9e75', colorHover: '#0f6e56', bgHover: '#e1f5ee' }
] as const;

export type UserName = (typeof USERS)[number]['value'];

export const CURRENCIES: Array<{ label: string; value: Currency }> = [
  { label: 'RSD', value: 'RSD' },
  { label: 'EUR', value: 'EUR' }
];

export const PAYMENT_METHODS = ['Kartica', 'Keš', 'Online'] as const;

export const QUICK_AMOUNTS = [500, 1000, 2000, 5000] as const;

export const DATE_FORMAT = 'dd.mm.yy';

export const LOCALE = 'sr-Latn';

export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000
} as const;

export const RECURRING_FREQUENCIES = [
  { label: 'Dnevno', value: 'daily' },
  { label: 'Nedeljno', value: 'weekly' },
  { label: 'Mesečno', value: 'monthly' }
] as const;

export const MONTH_NAMES = [
  'januar',
  'februar',
  'mart',
  'april',
  'maj',
  'jun',
  'jul',
  'avgust',
  'septembar',
  'oktobar',
  'novembar',
  'decembar'
] as const;
