import { format } from 'date-fns';
import type { Currency } from '@/types/expense';

/**
 * Format currency amount with proper symbol and locale
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const locale = currency === 'RSD' ? 'sr-RS' : 'de-DE';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback if Intl fails
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Format date to localized string
 */
export function formatDate(date: string | Date, formatStr: string = 'dd.MM.yyyy HH:mm'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    return String(date);
  }
}

/**
 * Format date for relative display (e.g., "2 hours ago", "yesterday")
 */
export function formatRelativeDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDate(dateObj, 'dd.MM.yyyy');
}

/**
 * Get current date-time in ISO format for API
 */
export function getCurrentDateTimeISO(): string {
  return new Date().toISOString();
}
