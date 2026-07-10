<template>
  <div class="home-view">
    <section class="balance-hero">
      <p class="hero-label">Bilans · {{ monthLabel }}</p>
      <p v-if="!loading" class="hero-amount" :class="{ negative: netRsd < 0 }">
        {{ netRsd >= 0 ? '+' : '−' }}{{ formatNumber(Math.abs(netRsd), false) }}
        <span class="hero-currency">RSD</span>
      </p>
      <p v-else class="hero-amount skeleton">&nbsp;</p>
      <p class="hero-sub">≈ {{ formatNumber(Math.abs(netEur)) }} EUR</p>

      <div v-if="!loading && dailyBars.some(b => b.value > 0)" class="hero-chart" aria-hidden="true">
        <div
          v-for="bar in dailyBars"
          :key="bar.day"
          class="hero-bar"
          :class="{ today: bar.isToday }"
          :style="{ height: bar.pct + '%' }"
        ></div>
      </div>

      <div class="totals-row">
        <router-link to="/income/list" class="total-card income">
          <p class="total-label"><i class="pi pi-arrow-down-left"></i> Prihodi</p>
          <p class="total-value">{{ formatNumber(incomeRsd, false) }}</p>
        </router-link>
        <router-link to="/list" class="total-card expense">
          <p class="total-label"><i class="pi pi-arrow-up-right"></i> Troškovi</p>
          <p class="total-value">{{ formatNumber(expenseRsd, false) }}</p>
        </router-link>
      </div>
    </section>

    <section class="recent-section">
      <div class="recent-header">
        <h2>Poslednje</h2>
        <router-link to="/list" class="see-all">Vidi sve</router-link>
      </div>

      <div v-if="loading" class="recent-skeleton">
        <div v-for="i in 4" :key="i" class="skeleton-row"></div>
      </div>

      <p v-else-if="recentItems.length === 0" class="empty-note">Nema stavki ovog meseca. Dodaj prvu pomoću dugmeta +.</p>

      <ul v-else class="recent-list">
        <li v-for="item in recentItems" :key="item.id" class="recent-item">
          <span class="item-icon" :class="item.kind" :style="item.kind === 'expense' ? categoryStyle(item.category) : undefined">
            <i :class="item.icon"></i>
          </span>
          <span class="item-body">
            <span class="item-title">{{ item.title }}</span>
            <span class="item-meta">{{ item.meta }}</span>
          </span>
          <span class="item-amount" :class="item.kind">
            {{ item.kind === 'income' ? '+' : '−' }}{{ formatNumber(item.rsdAmount, false) }}
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useBalanceStore } from '@/stores/balance';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';
import { CATEGORY_LABELS, type ExpenseCategory } from '@/constants/categories';
import { categoryColor, categoryIcon } from '@/constants/category-style';
import { incomeTypeLabels } from '@/types/income';

const balanceStore = useBalanceStore();
const { formatNumber, formatRelativeDate, formatMonthYear } = useTransactionFormatting();

const now = new Date();
const monthLabel = computed(() => formatMonthYear(now));

const loading = computed(() => balanceStore.loading);

const incomeRsd = computed(() => balanceStore.incomes.reduce((sum, i) => sum + i.rsdAmount, 0));
const expenseRsd = computed(() => balanceStore.expenses.reduce((sum, e) => sum + e.rsdAmount, 0));
const netRsd = computed(() => incomeRsd.value - expenseRsd.value);

const incomeEur = computed(() => balanceStore.incomes.reduce((sum, i) => sum + i.eurAmount, 0));
const expenseEur = computed(() => balanceStore.expenses.reduce((sum, e) => sum + e.eurAmount, 0));
const netEur = computed(() => incomeEur.value - expenseEur.value);

function categoryStyle(category: string) {
  const c = categoryColor(category);
  return { color: c, background: `${c}21` };
}

// Daily expense bars for the hero mini-chart (1st of month → today)
const dailyBars = computed(() => {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  const totals = new Array<number>(daysInMonth).fill(0);
  balanceStore.expenses.forEach(e => {
    const d = new Date(e.purchaseDate);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      totals[d.getDate() - 1] = (totals[d.getDate() - 1] ?? 0) + e.rsdAmount;
    }
  });
  const max = Math.max(...totals, 1);
  return totals.map((value, i) => ({
    day: i + 1,
    value,
    pct: Math.max(Math.round((value / max) * 100), 6),
    isToday: i + 1 === today
  }));
});

interface RecentItem {
  id: string;
  kind: 'expense' | 'income';
  title: string;
  meta: string;
  icon: string;
  category: string;
  rsdAmount: number;
  date: string;
}

const recentItems = computed<RecentItem[]>(() => {
  const expenses: RecentItem[] = balanceStore.expenses.map(e => ({
    id: `e-${e.id}`,
    kind: 'expense',
    title: e.shopName,
    meta: `${CATEGORY_LABELS[e.category as ExpenseCategory] ?? e.category} · ${formatRelativeDate(e.purchaseDate)}`,
    icon: categoryIcon(e.category),
    category: e.category,
    rsdAmount: e.rsdAmount,
    date: e.purchaseDate
  }));

  const incomes: RecentItem[] = balanceStore.incomes.map(i => ({
    id: `i-${i.id}`,
    kind: 'income',
    title: i.source,
    meta: `${incomeTypeLabels[i.incomeType] ?? i.incomeType} · ${formatRelativeDate(i.dateReceived)}`,
    icon: 'pi pi-wallet',
    category: '',
    rsdAmount: i.rsdAmount,
    date: i.dateReceived
  }));

  return [...expenses, ...incomes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
});

onMounted(() => {
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  balanceStore.fetchBalanceData({ startDate, endDate, limit: 1000 });
});
</script>

<style scoped>
.home-view {
  width: 100%;
  padding: 0.5rem 1.25rem 1.5rem;
}

.balance-hero {
  background: var(--hero-bg);
  border-radius: var(--radius-lg);
  padding: 1.375rem 1.25rem 1.25rem;
  margin-top: 0.25rem;
}

.hero-label {
  font-size: 0.8125rem;
  color: var(--hero-muted);
  margin-bottom: 0.25rem;
}

.hero-amount {
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--hero-text);
}

.hero-amount.negative {
  color: #f79c86;
}

.hero-amount.skeleton {
  width: 60%;
  background: var(--hero-chip);
  border-radius: var(--radius-sm);
}

.hero-currency {
  font-size: 1rem;
  font-weight: 500;
  color: var(--hero-muted);
}

.hero-sub {
  font-size: 0.8125rem;
  color: var(--hero-muted);
  margin-top: 0.125rem;
}

.hero-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 44px;
  margin-top: 1.125rem;
}

.hero-bar {
  flex: 1;
  min-width: 2px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.28);
  transition: height 0.3s ease;
}

.hero-bar.today {
  background: #56dfa9;
}

.totals-row {
  display: flex;
  gap: 0.625rem;
  margin-top: 1.125rem;
}

.total-card {
  flex: 1;
  border-radius: var(--radius-md);
  padding: 0.75rem 0.875rem;
  text-decoration: none;
  background: var(--hero-chip);
  transition: background 0.15s;
}

.total-card:hover {
  background: rgba(255, 255, 255, 0.16);
}

.total-label {
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
}

.total-label i {
  font-size: 0.7rem;
}

.total-card.income .total-label {
  color: #56dfa9;
}

.total-card.expense .total-label {
  color: #f79c86;
}

.total-value {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--hero-text);
}

.recent-section {
  margin-top: 1.75rem;
}

.recent-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.recent-header h2 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.see-all {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--primary-color);
  text-decoration: none;
}

.recent-list {
  list-style: none;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid var(--border-color);
}

.recent-item:last-child {
  border-bottom: none;
}

.item-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  background: var(--surface-hover);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon.income {
  background: var(--income-light);
  color: var(--income-color);
}

.item-icon i {
  font-size: 1rem;
}

.item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.item-amount {
  font-size: 0.9375rem;
  font-weight: 600;
  white-space: nowrap;
}

.item-amount.expense {
  color: var(--expense-color);
}

.item-amount.income {
  color: var(--income-color);
}

.empty-note {
  font-size: 0.875rem;
  color: var(--text-secondary);
  padding: 1.5rem 0;
  text-align: center;
}

.recent-skeleton .skeleton-row {
  height: 52px;
  border-radius: var(--radius-sm);
  background: var(--surface-hover);
  margin-bottom: 0.5rem;
}

@media (min-width: 769px) {
  .home-view {
    padding: 0.5rem 0 1.5rem;
  }

  .hero-amount {
    font-size: 2.75rem;
  }
}
</style>
