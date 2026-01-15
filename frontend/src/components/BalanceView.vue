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
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spinner pi-spin" style="font-size: 2rem"></i>
      <p>Učitavanje podataka...</p>
    </div>

    <!-- Main Content -->
    <div v-else-if="!loading && hasData" class="balance-content">
      <!-- Main Balance Chart -->
      <div class="chart-section main-chart-section">
        <h3 class="chart-title">Ukupan bilans</h3>
        <DoughnutChart
          :labels="['Prihodi', 'Troškovi']"
          :data="[totalIncome, totalExpense]"
          :colors="['#10b981', '#ef4444']"
          :center-text="formatBalance(netBalance)"
          :center-subtext="netBalance >= 0 ? 'Profit' : 'Deficit'"
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
          <PieChart v-if="categoryLabels.length > 0" :labels="categoryLabels" :data="categoryData" :colors="categoryColors" />
          <div v-else class="empty-chart">Nema podataka o kategorijama</div>
        </div>

        <!-- Person Comparison -->
        <div class="chart-section">
          <h3 class="chart-title">Troškovi po osobi</h3>
          <DoughnutChart
            v-if="personLabels.length > 0"
            :labels="personLabels"
            :data="personData"
            :colors="personColors"
          />
          <div v-else class="empty-chart">Nema podataka po osobi</div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <i class="pi pi-chart-line" style="font-size: 3rem; color: #9ca3af"></i>
      <h3>Nema podataka za izabrani period</h3>
      <p>Pokušajte da promenite filter ili dodajte nove troškove/prihode</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import Button from 'primevue/button';
import { expenseApi } from '@/api/expenses';
import { incomeApi } from '@/api/incomes';
import { useListFormatting } from '@/composables/useListFormatting';
import { USERS } from '@/constants/app';
import DoughnutChart from '@/components/shared/DoughnutChart.vue';
import PieChart from '@/components/shared/PieChart.vue';
import type { Expense } from '@/types/expense';
import type { Income } from '@/types/income';

const { formatRSD, formatMonthYear } = useListFormatting();

// Filters
const currentMonth = ref(new Date());
const selectedPerson = ref('all');

const personOptions = [
  { label: 'Svi', value: 'all' },
  { label: 'Svetla', value: 'Svetla' },
  { label: 'Dejan', value: 'Dejan' },
];

// Data
const expenses = ref<Expense[]>([]);
const incomes = ref<Income[]>([]);
const loading = ref(false);

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
  return expenses.value.reduce((sum, expense) => sum + expense.rsdAmount, 0);
});

const totalIncome = computed(() => {
  return incomes.value.reduce((sum, income) => sum + income.rsdAmount, 0);
});

const netBalance = computed(() => {
  return totalIncome.value - totalExpense.value;
});

const hasData = computed(() => {
  return expenses.value.length > 0 || incomes.value.length > 0;
});

// Computed: Category breakdown
const categoryData = computed(() => {
  const categoryMap = new Map<string, number>();
  expenses.value.forEach(expense => {
    const category = expense.category || 'Nekategorisano';
    categoryMap.set(category, (categoryMap.get(category) || 0) + expense.rsdAmount);
  });
  return Array.from(categoryMap.values());
});

const categoryLabels = computed(() => {
  const categoryMap = new Map<string, number>();
  expenses.value.forEach(expense => {
    const category = expense.category || 'Nekategorisano';
    categoryMap.set(category, (categoryMap.get(category) || 0) + expense.rsdAmount);
  });
  return Array.from(categoryMap.keys());
});

const categoryColors = computed<string[]>(() => {
  const colors: string[] = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  ];
  return categoryLabels.value.map((_, index) => colors[index % colors.length]!);
});

// Computed: Person breakdown
const personData = computed(() => {
  const personMap = new Map<string, number>();
  expenses.value.forEach(expense => {
    personMap.set(expense.createdBy, (personMap.get(expense.createdBy) || 0) + expense.rsdAmount);
  });
  return Array.from(personMap.values());
});

const personLabels = computed(() => {
  const personMap = new Map<string, number>();
  expenses.value.forEach(expense => {
    personMap.set(expense.createdBy, (personMap.get(expense.createdBy) || 0) + expense.rsdAmount);
  });
  return Array.from(personMap.keys());
});

const personColors = computed<string[]>(() => {
  return personLabels.value.map(name => {
    const user = USERS.find(u => u.value === name);
    return (user ? user.color : '#9ca3af') as string;
  });
});

// Format balance with sign
function formatBalance(amount: number): string {
  const formatted = new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

// Fetch data
async function fetchData() {
  loading.value = true;
  try {
    const params: any = {
      startDate: dateRange.value.start.toISOString(),
      endDate: dateRange.value.end.toISOString(),
      limit: 1000,
    };

    if (selectedPerson.value !== 'all') {
      params.createdBy = selectedPerson.value;
    }

    // Fetch expenses and incomes in parallel
    const [expensesResponse, incomesResponse] = await Promise.all([
      expenseApi.getAll(params),
      incomeApi.getAll(params),
    ]);

    expenses.value = expensesResponse.data;
    incomes.value = incomesResponse.data;
  } catch (error) {
    console.error('Failed to fetch balance data:', error);
    expenses.value = [];
    incomes.value = [];
  } finally {
    loading.value = false;
  }
}

// Watch for filter changes
watch([currentMonth, selectedPerson], () => {
  fetchData();
});

// Initial load
onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.balance-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

.balance-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 1.5rem;
}

/* Filters */
.balance-filters {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
}

.month-navigation {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: white;
  padding: 0.75rem 1.5rem;
  border-radius: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.current-month {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
  min-width: 150px;
  text-align: center;
}

.month-nav-btn {
  color: #6b7280 !important;
}

.person-pills {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.person-pill {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 2rem;
  background: white;
  color: #6b7280;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.person-pill:hover {
  border-color: #f59e0b;
  color: #f59e0b;
}

.person-pill.active {
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
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

.loading-state p,
.empty-state h3 {
  margin-top: 1rem;
  color: #6b7280;
}

.empty-state p {
  margin-top: 0.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
}

/* Content */
.balance-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Chart Sections */
.chart-section {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.main-chart-section {
  padding: 2rem;
}

.chart-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 1.5rem;
  text-align: center;
}

.empty-chart {
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
  font-size: 0.875rem;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 2rem;
}

.metric-card {
  padding: 1.25rem;
  border-radius: 0.5rem;
  text-align: center;
}

.income-metric {
  background: #ecfdf5;
  border: 2px solid #10b981;
}

.expense-metric {
  background: #fef2f2;
  border: 2px solid #ef4444;
}

.balance-metric {
  border: 2px solid #f59e0b;
}

.balance-metric.positive {
  background: #ecfdf5;
  border-color: #10b981;
}

.balance-metric.negative {
  background: #fef2f2;
  border-color: #ef4444;
}

.metric-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
}

/* Secondary Charts */
.secondary-charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
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
    justify-content: center;
  }

  .person-pills {
    justify-content: center;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .main-chart-section {
    padding: 1.5rem;
  }

  .chart-title {
    font-size: 1.125rem;
  }
}
</style>