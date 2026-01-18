import { parseISO } from 'date-fns';
import { LOCALE, MONTH_NAMES } from '@/constants/app';

export function useListFormatting() {
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      const day = date.getDate();
      const month = date.toLocaleDateString(LOCALE, { month: 'short' });
      const year = date.getFullYear();
      const time = date.toLocaleTimeString('sr-RS', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return {
        day,
        month,
        year,
        time,
        full: `${day}. ${month} ${year}`
      };
    } catch (error) {
      console.error('Error formatting date:', error);
      return {
        day: '-',
        month: '-',
        year: '-',
        time: '-',
        full: '-'
      };
    }
  };

  const formatRSD = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatEUR = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatAmount = (amount: number, currency: 'RSD' | 'EUR') => {
    return currency === 'RSD' ? formatRSD(amount) : formatEUR(amount);
  };

  const getMonthNameLatin = (monthIndex: number) => {
    return MONTH_NAMES[monthIndex] || 'nepoznat';
  };

  const formatMonthYear = (date: Date) => {
    const monthName = getMonthNameLatin(date.getMonth());
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${date.getFullYear()}`;
  };

  return {
    formatDate,
    formatRSD,
    formatEUR,
    formatAmount,
    getMonthNameLatin,
    formatMonthYear
  };
}
