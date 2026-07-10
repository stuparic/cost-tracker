<template>
  <div class="balance-view">
    <h2 class="balance-title">Bilans</h2>

    <!-- Filters Section -->
    <div class="balance-filters">
      <!-- Month Navigation -->
      <div class="month-navigation">
        <Button icon="pi pi-chevron-left" text rounded class="month-nav-btn" @click="navigateMonth(-1)" />
        <span class="current-month">{{ currentMonthLabel }}</span>
        <Button icon="pi pi-chevron-right" text rounded class="month-nav-btn" @click="navigateMonth(1)" />
      </div>

      <!-- Person Filter Pills -->
      <div class="person-pills">
        <button
          v-for="option in personOptions"
          :key="option.value"
          class="person-pill"
          :class="{ active: selectedPerson === option.value }"
          @click="selectedPerson = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- Export Actions -->
      <div class="export-actions">
        <Button label="Troškovi CSV" icon="pi pi-download" text size="small" :loading="exportingExpenses" @click="exportExpenses" />
        <Button label="Prihodi CSV" icon="pi pi-download" text size="small" :loading="exportingIncomes" @click="exportIncomes" />
        <Button label="Pun backup (JSON)" icon="pi pi-database" text size="small" :loading="exportingBackup" @click="exportBackup" />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="balanceStore.loading" class="loading-state">
      <i class="pi pi-spinner pi-spin" style="font-size: 2rem"></i>
      <p>Učitavanje podataka...</p>
    </div>

    <!-- Main Content -->
    <div v-else-if="!balanceStore.loading && hasData" class="balance-content">
      <!-- Main Balance Chart -->
      <div class="chart-section main-chart-section">
        <h3 class="chart-title">Ukupan bilans</h3>
        <p class="chart-hint">Klikni na parče grafikona za detalje</p>
        <DoughnutChart
          :labels="['Prihodi', 'Troškovi']"
          :data="[totalIncome, totalExpense]"
          :colors="['#1d9e75', '#d85a30']"
          :center-text="formatBalance(netBalance)"
          :center-subtext="netBalance >= 0 ? 'Profit' : 'Deficit'"
          @slice-click="onMainSlice"
        />

        <!-- Key Metrics -->
        <div class="metrics-grid">
          <div class="metric-card income-metric">
            <div class="metric-label">Ukupan prihod</div>
            <div class="metric-value">{{ formatRSD(totalIncome) }}</div>
          </div>
          <div class="metric-card expense-metric">
            <div class="metric-label">Ukupan trošak</div>
            <div class="metric-value">{{ formatRSD(totalExpense) }}</div>
          </div>
          <div class="metric-card balance-metric" :class="{ positive: netBalance >= 0, negative: netBalance < 0 }">
            <div class="metric-label">Neto bilans</div>
            <div class="metric-value">{{ formatRSD(netBalance) }}</div>
          </div>
        </div>
      </div>

      <!-- Secondary Charts Grid -->
      <div class="secondary-charts-grid">
        <!-- Category Breakdown -->
        <div class="chart-section">
          <h3 class="chart-title">Troškovi po kategorijama</h3>
          <p class="chart-hint">Klikni na kategoriju za detalje</p>
          <DoughnutChart
            v-if="categoryLabels.length > 0"
            :labels="categoryLabels"
            :data="categoryData"
            :colors="categoryColors"
            @slice-click="onCategorySlice"
          />
          <div v-else class="empty-chart">Nema podataka o kategorijama</div>
        </div>

        <!-- Person Comparison -->
        <div class="chart-section">
          <h3 class="chart-title">Troškovi po osobi</h3>
          <DoughnutChart v-if="personLabels.length > 0" :labels="personLabels" :data="personData" :colors="personColors" />
          <div v-else class="empty-chart">Nema podataka po osobi</div>
        </div>
      </div>

      <!-- Drill-down panel: opens on doughnut slice click -->
      <div v-if="detail" ref="detailPanel" class="chart-section detail-panel">
        <div class="detail-header">
          <h3 class="chart-title detail-title">{{ detail.kind === 'incomes' ? 'Detalji prihoda' : 'Detalji troškova' }}</h3>
          <Button icon="pi pi-times" text rounded size="small" aria-label="Zatvori detalje" @click="detail = null" />
        </div>
        <IncomeBreakdownList v-if="detail.kind === 'incomes'" :incomes="balanceStore.incomes" />
        <CategoryBreakdownList v-else :expenses="balanceStore.expenses" :initial-category="detail.category" />
      </div>

      <!-- Category Budgets -->
      <div class="chart-section budget-section">
        <h3 class="chart-title">Budžet po kategorijama</h3>
        <BudgetProgressList :spent-by-category="spentByCategoryMap" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <i class="pi pi-chart-line empty-icon"></i>
      <h3>Nema podataka za izabrani period</h3>
      <p>Pokušajte da promenite filter ili dodajte nove troškove/prihode</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import Button from 'primevue/button';
import { useListFormatting } from '@/composables/useListFormatting';
import { useAppToast } from '@/composables/useAppToast';
import { USERS } from '@/constants/app';
import DoughnutChart from '@/components/shared/DoughnutChart.vue';
import BudgetProgressList from '@/components/shared/BudgetProgressList.vue';
import CategoryBreakdownList from '@/components/shared/CategoryBreakdownList.vue';
import IncomeBreakdownList from '@/components/shared/IncomeBreakdownList.vue';
import { CATEGORY_LABELS, type ExpenseCategory } from '@/constants/categories';
import { categoryColor } from '@/constants/category-style';
import { useBalanceStore, type BalanceQueryParams } from '@/stores/balance';
import { useBudgetsStore } from '@/stores/budgets';
import { expenseApi } from '@/api/expenses';
import { incomeApi } from '@/api/incomes';
import { backupApi } from '@/api/backup';
import { downloadBlob } from '@/utils/download';

const { formatRSD, formatMonthYear } = useListFormatting();
const { showError } = useAppToast();
const balanceStore = useBalanceStore();
const budgetsStore = useBudgetsStore();
const exportingExpenses = ref(false);
const exportingIncomes = ref(false);
const exportingBackup = ref(false);

// Filters
const currentMonth = ref(new Date());
const selectedPerson = ref('all');

const personOptions = [
  { label: 'Svi', value: 'all' },
  { label: 'Svetla', value: 'Svetla' },
  { label: 'Dejan', value: 'Dejan' }
];

// Month navigation
const currentMonthLabel = computed(() => formatMonthYear(currentMonth.value));

function navigateMonth(direction: number) {
  const newMonth = new Date(currentMonth.value);
  newMonth.setMonth(newMonth.getMonth() + direction);
  currentMonth.value = newMonth;
}

// Computed: Date range
const dateRange = computed(() => {
  const start = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
  const end = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
});

// Computed: Totals
const totalExpense = computed(() => {
  return balanceStore.expenses.reduce((sum, expense) => sum + expense.rsdAmount, 0);
});

const totalIncome = computed(() => {
  return balanceStore.incomes.reduce((sum, income) => sum + income.rsdAmount, 0);
});

const netBalance = computed(() => {
  return totalIncome.value - totalExpense.value;
});

const hasData = computed(() => {
  return balanceStore.expenses.length > 0 || balanceStore.incomes.length > 0;
});

// Computed: Category breakdown (keys are raw category ids, labels are Serbian)
const categoryTotals = computed(() => {
  const categoryMap = new Map<string, number>();
  balanceStore.expenses.forEach(expense => {
    const category = expense.category || 'Other';
    categoryMap.set(category, (categoryMap.get(category) || 0) + expense.rsdAmount);
  });
  return Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);
});

const categoryKeys = computed(() => categoryTotals.value.map(([key]) => key));
const categoryData = computed(() => categoryTotals.value.map(([, total]) => total));
const categoryLabels = computed(() => categoryKeys.value.map(key => CATEGORY_LABELS[key as ExpenseCategory] ?? key));
const categoryColors = computed<string[]>(() => categoryKeys.value.map(key => categoryColor(key)));

// Drill-down panel state (opens on doughnut slice click)
const detail = ref<{ kind: 'incomes' } | { kind: 'expenses'; category: string | null } | null>(null);
const detailPanel = ref<HTMLElement | null>(null);

function onMainSlice({ index }: { label: string; index: number }) {
  detail.value = index === 0 ? { kind: 'incomes' } : { kind: 'expenses', category: null };
}

function onCategorySlice({ index }: { label: string; index: number }) {
  detail.value = { kind: 'expenses', category: categoryKeys.value[index] ?? null };
}

watch(detail, async value => {
  if (!value) return;
  await nextTick();
  detailPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Computed: Person breakdown
const personData = computed(() => {
  const personMap = new Map<string, number>();
  balanceStore.expenses.forEach(expense => {
    personMap.set(expense.createdBy, (personMap.get(expense.createdBy) || 0) + expense.rsdAmount);
  });
  return Array.from(personMap.values());
});

const personLabels = computed(() => {
  const personMap = new Map<string, number>();
  balanceStore.expenses.forEach(expense => {
    personMap.set(expense.createdBy, (personMap.get(expense.createdBy) || 0) + expense.rsdAmount);
  });
  return Array.from(personMap.keys());
});

// Computed: spend per raw category key, for budget progress bars
const spentByCategoryMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {};
  balanceStore.expenses.forEach(expense => {
    const category = expense.category || 'Other';
    map[category] = (map[category] || 0) + expense.rsdAmount;
  });
  return map;
});

const personColors = computed<string[]>(() => {
  return personLabels.value.map(name => {
    const user = USERS.find(u => u.value === name);
    return (user ? user.color : '#888780') as string;
  });
});

// Format balance with sign
function formatBalance(amount: number): string {
  const formatted = new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.abs(amount));
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

// Fetch data
async function fetchData() {
  const params: BalanceQueryParams = {
    startDate: dateRange.value.start.toISOString(),
    endDate: dateRange.value.end.toISOString(),
    limit: 1000
  };

  if (selectedPerson.value !== 'all') {
    params.createdBy = selectedPerson.value;
  }

  await balanceStore.fetchBalanceData(params);
}

// Export current filter selection as CSV
async function exportExpenses() {
  exportingExpenses.value = true;
  try {
    const params: Record<string, string> = {
      startDate: dateRange.value.start.toISOString(),
      endDate: dateRange.value.end.toISOString()
    };
    if (selectedPerson.value !== 'all') {
      params.createdBy = selectedPerson.value;
    }
    const blob = await expenseApi.exportCsv(params);
    downloadBlob(blob, `troskovi-${currentMonthLabel.value.replace(/\s+/g, '-')}.csv`);
  } catch (error) {
    showError('Izvoz troškova nije uspeo.', error);
  } finally {
    exportingExpenses.value = false;
  }
}

async function exportIncomes() {
  exportingIncomes.value = true;
  try {
    const params: Record<string, string> = {
      startDate: dateRange.value.start.toISOString(),
      endDate: dateRange.value.end.toISOString()
    };
    if (selectedPerson.value !== 'all') {
      params.createdBy = selectedPerson.value;
    }
    const blob = await incomeApi.exportCsv(params);
    downloadBlob(blob, `prihodi-${currentMonthLabel.value.replace(/\s+/g, '-')}.csv`);
  } catch (error) {
    showError('Izvoz prihoda nije uspeo.', error);
  } finally {
    exportingIncomes.value = false;
  }
}

// Full, unfiltered JSON backup (all expenses, incomes and budgets)
async function exportBackup() {
  exportingBackup.value = true;
  try {
    const blob = await backupApi.exportJson();
    downloadBlob(blob, `troskic-backup-${new Date().toISOString().slice(0, 10)}.json`);
  } catch (error) {
    showError('Backup nije uspeo.', error);
  } finally {
    exportingBackup.value = false;
  }
}

// Watch for filter changes
watch([currentMonth, selectedPerson], () => {
  detail.value = null;
  fetchData();
});

// Initial load
onMounted(() => {
  // Check if preloaded data matches current filters
  const currentParams = {
    startDate: dateRange.value.start.toISOString(),
    endDate: dateRange.value.end.toISOString(),
    limit: 1000
  };

  const paramsMatch =
    balanceStore.lastFetchParams &&
    balanceStore.lastFetchParams.startDate === currentParams.startDate &&
    balanceStore.lastFetchParams.endDate === currentParams.endDate &&
    (selectedPerson.value === 'all' || balanceStore.lastFetchParams.createdBy === selectedPerson.value);

  // Only fetch if preloaded data doesn't match current filters
  if (!paramsMatch && !balanceStore.loading) {
    fetchData();
  }

  if (!budgetsStore.loaded) {
    budgetsStore.fetchBudgets();
  }
});
</script>

<style scoped>
.balance-view {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0.5rem 1.25rem 1.5rem;
}

.balance-title {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

/* Filters */
.balance-filters {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.month-navigation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-card);
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
}

.current-month {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 120px;
  text-align: center;
}

.month-nav-btn {
  color: var(--text-secondary) !important;
}

.person-pills {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--surface-hover);
  border-radius: 999px;
}

.person-pill {
  padding: 0.45rem 1rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.person-pill:hover {
  color: var(--primary-color);
}

.person-pill.active {
  background: var(--surface-card);
  color: var(--primary-color);
  box-shadow: var(--shadow-card);
}

.export-actions {
  display: flex;
  gap: 0.25rem;
}

.export-actions :deep(.p-button) {
  color: var(--text-secondary) !important;
  font-size: 0.8125rem;
}

/* Loading & Empty States */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 2.5rem;
  color: var(--text-secondary);
  opacity: 0.6;
}

.loading-state p,
.empty-state h3 {
  margin-top: 1rem;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
}

.empty-state p {
  margin-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* Content */
.balance-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Chart Sections */
.chart-section {
  background: var(--surface-card);
  padding: 1.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-card);
}

.main-chart-section {
  padding: 2rem;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1.25rem;
  text-align: center;
}

.chart-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
  margin: -1rem 0 1rem;
}

.detail-panel {
  scroll-margin-top: 120px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.detail-header .detail-title {
  margin-bottom: 0;
  text-align: left;
}

.empty-chart {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-top: 1.75rem;
}

.metric-card {
  padding: 1rem;
  border-radius: var(--radius-md);
  text-align: center;
}

.income-metric {
  background: var(--income-light);
}

.income-metric .metric-value {
  color: var(--income-dark);
}

.expense-metric {
  background: var(--expense-light);
}

.expense-metric .metric-value {
  color: var(--expense-dark);
}

.balance-metric {
  background: var(--surface-hover);
}

.balance-metric.positive {
  background: var(--income-light);
}

.balance-metric.positive .metric-value {
  color: var(--income-dark);
}

.balance-metric.negative {
  background: var(--expense-light);
}

.balance-metric.negative .metric-value {
  color: var(--expense-dark);
}

.metric-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.375rem;
  font-weight: 600;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

/* Secondary Charts */
.secondary-charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

/* Responsive */
@media (max-width: 1024px) {
  .secondary-charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .balance-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .month-navigation {
    justify-content: space-between;
  }

  .person-pills {
    justify-content: center;
  }

  .person-pill {
    flex: 1;
  }

  .export-actions {
    justify-content: center;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .main-chart-section {
    padding: 1.25rem;
  }
}
</style>
