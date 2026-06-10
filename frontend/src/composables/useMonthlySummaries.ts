import { computed, ref, watch, type Ref } from 'vue';
import { useTransactionFormatting } from './useTransactionFormatting';

export interface MonthlySummary {
  /** Stable key: "YYYY-M" */
  month: string;
  monthName: string;
  totalRsd: number;
  totalEur: number;
}

export type MonthTotalsFetcher = (startDate: string, endDate: string) => Promise<{ rsd: number; eur: number }>;

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

/**
 * Summary cards logic shared by the expense and income lists: totals for the
 * viewed month plus the two months before it, refreshed whenever the viewed
 * month changes.
 */
export function useMonthlySummaries(currentMonth: Ref<Date>, fetchTotals: MonthTotalsFetcher) {
  const { formatMonthYear } = useTransactionFormatting();

  const summaries = ref<MonthlySummary[]>([]);
  const loading = ref(false);
  let refreshToken = 0;

  const viewedMonthKey = computed(() => monthKey(currentMonth.value));

  async function refresh(): Promise<void> {
    loading.value = true;
    const token = ++refreshToken;
    try {
      const base = currentMonth.value;
      const result: MonthlySummary[] = [];

      for (let i = 0; i < 3; i++) {
        const monthDate = new Date(base.getFullYear(), base.getMonth() - i, 1);
        const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

        const totals = await fetchTotals(startDate.toISOString(), endDate.toISOString());
        result.push({
          month: monthKey(monthDate),
          monthName: formatMonthYear(monthDate),
          totalRsd: totals.rsd,
          totalEur: totals.eur
        });
      }

      if (token !== refreshToken) return; // superseded by a newer refresh
      summaries.value = result;
    } catch (error) {
      console.error('Failed to load monthly summaries:', error);
    } finally {
      loading.value = false;
    }
  }

  watch(currentMonth, refresh);

  return { summaries, loading, viewedMonthKey, refresh };
}
