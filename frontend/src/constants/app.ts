import type { Currency } from '@/types/expense';

export const USERS = [
  { label: 'Svetla', value: 'Svetla', color: '#a855f7', colorHover: '#7c3aed', bgHover: '#faf5ff' },
  { label: 'Dejan', value: 'Dejan', color: '#10b981', colorHover: '#059669', bgHover: '#ecfdf5' }
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
