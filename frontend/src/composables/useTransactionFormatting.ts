import { MONTH_NAMES } from '@/constants/app';

/**
 * Shared formatting for transaction lists (expenses and incomes):
 * relative dates ("Danas"/"Juče"/"Prekjuče"), Serbian number formatting
 * and month labels.
 */
export function useTransactionFormatting() {
  function formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    const dayDiff = Math.round((today.getTime() - compareDate.getTime()) / 86400000);
    if (dayDiff === 0) return 'Danas';
    if (dayDiff === 1) return 'Juče';
    if (dayDiff === 2) return 'Prekjuče';

    return date.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatNumber(amount: number, decimals = true): string {
    return amount.toLocaleString('sr-RS', {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0
    });
  }

  function formatMonthYear(date: Date): string {
    const name = MONTH_NAMES[date.getMonth()] || '';
    return `${name.charAt(0).toUpperCase() + name.slice(1)} ${date.getFullYear()}`;
  }

  return { formatRelativeDate, formatNumber, formatMonthYear };
}
