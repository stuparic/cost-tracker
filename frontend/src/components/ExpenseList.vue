<template>
  <div class="expense-list">
    <h2 class="list-title">Lista troškova</h2>

    <!-- Monthly Summaries -->
    <div class="monthly-summaries">
      <div v-for="summary in monthlySummaries" :key="summary.month" class="summary-card" :class="{ loading: loadingSummaries }">
        <div class="summary-month">{{ summary.monthName }}</div>
        <div class="summary-amount-row">
          <span class="summary-amount">{{ formatAmount(summary.totalRsd, false) }}</span>
          <span class="summary-currency">RSD</span>
        </div>
        <div class="summary-amount-secondary">{{ formatAmount(summary.totalEur, true) }} EUR</div>
      </div>
    </div>

    <!-- Quick Filters -->
    <div class="quick-filters">
      <!-- Month Navigation -->
      <div class="month-navigation">
        <Button icon="pi pi-chevron-left" text rounded class="month-nav-btn" @click="navigateMonth(-1)" />
        <span class="current-month">{{ currentMonthLabel }}</span>
        <Button icon="pi pi-chevron-right" text rounded class="month-nav-btn" @click="navigateMonth(1)" />
      </div>

      <!-- Person Pills -->
      <div class="person-pills">
        <button
          v-for="option in personOptions"
          :key="option.value"
          class="person-pill"
          :class="{ active: filters.createdBy === option.value }"
          @click="filters.createdBy = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- More Filters Button -->
      <Button
        v-tooltip.top="'Dodatni filteri'"
        icon="pi pi-filter"
        text
        rounded
        class="more-filters-btn"
        @click="advancedFiltersVisible = true"
      >
        <span v-if="advancedFiltersCount > 0" class="filter-count-badge">
          {{ advancedFiltersCount }}
        </span>
      </Button>
    </div>

    <!-- Advanced Filters Sidebar -->
    <Sidebar v-model:visible="advancedFiltersVisible" position="right" class="advanced-filters-sidebar">
      <template #header>
        <h3>Dodatni filteri</h3>
      </template>

      <div class="advanced-filters-content">
        <div class="filter-field">
          <label class="filter-label">Prodavnica</label>
          <AutoComplete
            v-model="filters.shopName"
            :suggestions="shopSuggestions"
            placeholder="Pretraži prodavnicu"
            class="filter-input"
            @complete="searchShops"
          />
        </div>

        <div class="filter-field">
          <label class="filter-label">Kategorija</label>
          <AutoComplete
            v-model="filters.category"
            :suggestions="categorySuggestions"
            placeholder="Pretraži kategoriju"
            class="filter-input"
            @complete="searchCategories"
          />
        </div>

        <div class="filter-actions">
          <Button
            label="Očisti dodatne filtere"
            icon="pi pi-filter-slash"
            severity="secondary"
            outlined
            class="w-full"
            @click="clearAdvancedFilters"
          />
        </div>
      </div>
    </Sidebar>

    <!-- Data Table -->
    <div class="table-wrapper">
      <DataTable
        :value="expensesStore.expenses"
        :loading="expensesStore.loading"
        :paginator="true"
        :rows="20"
        :total-records="expensesStore.pagination.total"
        :lazy="true"
        paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        current-page-report-template="Prikazano {first} do {last} od {totalRecords} troškova"
        class="expenses-table"
        striped-rows
        :row-class="getRowClass"
        @page="onPageChange"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-inbox"></i>
            <p>Nema troškova za prikaz</p>
          </div>
        </template>

        <Column field="purchaseDate" header="Datum" :sortable="true" style="min-width: 110px">
          <template #body="{ data }">
            {{ formatDate(data.purchaseDate) }}
          </template>
        </Column>

        <Column field="shopName" header="Prodavnica" :sortable="true" style="min-width: 150px" />

        <Column field="amount" header="Iznos" :sortable="true" style="min-width: 130px">
          <template #body="{ data }">
            <div class="amount-cell">
              <span class="amount-primary">{{ formatAmount(data.rsdAmount, false) }} RSD</span>
              <span class="amount-secondary">{{ formatAmount(data.eurAmount, true) }} EUR</span>
            </div>
          </template>
        </Column>

        <Column field="category" header="Kategorija" :sortable="true" style="min-width: 120px">
          <template #body="{ data }">
            <span class="category-badge">{{ data.category }}</span>
          </template>
        </Column>

        <Column header="Izvor" style="min-width: 100px">
          <template #body="{ data }">
            <Tag v-if="data.creationMethod === 'auto'" value="Auto" severity="info" icon="pi pi-replay" />
            <Tag v-else-if="data.creationMethod === 'voice'" value="Glasovno" severity="success" icon="pi pi-microphone" />
            <span v-else class="manual-label">Rucno</span>
          </template>
        </Column>

        <Column field="productDescription" header="Opis" style="min-width: 150px" />

        <Column field="createdBy" header="Osoba" :sortable="true" style="min-width: 100px">
          <template #body="{ data }">
            <span class="person-badge" :class="data.createdBy ? data.createdBy.toLowerCase() : 'unknown'">
              {{ data.createdBy || 'Nepoznato' }}
            </span>
          </template>
        </Column>

        <Column header="Akcije" style="min-width: 100px">
          <template #body="{ data }">
            <div class="action-buttons">
              <Button v-tooltip.top="'Izmeni'" icon="pi pi-pencil" severity="secondary" text rounded @click="openEditDialog(data)" />
              <Button v-tooltip.top="'Obriši'" icon="pi pi-trash" severity="danger" text rounded @click="confirmDelete(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Edit Expense Dialog -->
    <EditExpenseDialog v-if="expenseToEdit" v-model:visible="editDialogVisible" :expense="expenseToEdit" @success="handleEditSuccess" />

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:visible="deleteDialogVisible" header="Potvrdi brisanje" :modal="true" class="delete-dialog">
      <p>Da li ste sigurni da želite da obrišete ovaj trošak?</p>
      <template #footer>
        <Button label="Otkaži" severity="secondary" @click="deleteDialogVisible = false" />
        <Button label="Obriši" severity="danger" :loading="deleting" @click="deleteExpense" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useExpensesStore } from '@/stores/expenses';
import { useToast } from 'primevue/usetoast';
import { autocompleteApi } from '@/api/autocomplete';
import { expenseApi } from '@/api/expenses';
import type { Expense } from '@/types/expense';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import AutoComplete from 'primevue/autocomplete';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Sidebar from 'primevue/sidebar';
import EditExpenseDialog from './EditExpenseDialog.vue';

const toast = useToast();
const expensesStore = useExpensesStore();

// Current month tracking
const currentMonth = ref(new Date());

// Compute date range from current month
const dateRange = computed(() => {
  const start = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
  const end = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0, 23, 59, 59);
  return [start, end];
});

// Current month label
const currentMonthLabel = computed(() => {
  return getMonthNameLatin(currentMonth.value);
});

// Filters
const filters = reactive({
  createdBy: '',
  shopName: '',
  category: ''
});

// Person filter options
const personOptions = [
  { label: 'Sve', value: '' },
  { label: 'Svetla', value: 'Svetla' },
  { label: 'Dejan', value: 'Dejan' }
];

// Autocomplete suggestions
const shopSuggestions = ref<string[]>([]);
const categorySuggestions = ref<string[]>([]);

// Delete dialog
const deleteDialogVisible = ref(false);
const expenseToDelete = ref<Expense | null>(null);
const deleting = ref(false);

// Edit dialog
const editDialogVisible = ref(false);
const expenseToEdit = ref<Expense | null>(null);

// Monthly summaries
interface MonthlySummary {
  month: string;
  monthName: string;
  totalRsd: number;
  totalEur: number;
}

const monthlySummaries = ref<MonthlySummary[]>([]);
const loadingSummaries = ref(false);

// Advanced filters sidebar
const advancedFiltersVisible = ref(false);

// Count advanced filters
const advancedFiltersCount = computed(() => {
  let count = 0;
  if (filters.shopName) count++;
  if (filters.category) count++;
  return count;
});

// Fetch expenses when filters or month change (but not on initial mount)
watch(
  [filters, currentMonth],
  () => {
    fetchExpenses();
  },
  { deep: true, immediate: false }
);

async function fetchExpenses(page = 1) {
  const params: any = {
    page,
    limit: 20
  };

  const range = dateRange.value;
  if (range && range.length === 2 && range[0] && range[1]) {
    params.startDate = range[0].toISOString();
    params.endDate = range[1].toISOString();
  }

  if (filters.createdBy) {
    params.createdBy = filters.createdBy;
  }

  if (filters.shopName) {
    params.shopName = filters.shopName;
  }

  if (filters.category) {
    params.category = filters.category;
  }

  await expensesStore.fetchExpenses(params);
}

function onPageChange(event: any) {
  fetchExpenses(event.page + 1);
}

function navigateMonth(direction: number) {
  const newMonth = new Date(currentMonth.value);
  newMonth.setMonth(newMonth.getMonth() + direction);
  currentMonth.value = newMonth;
}

function clearAdvancedFilters() {
  filters.shopName = '';
  filters.category = '';
  advancedFiltersVisible.value = false;
}

function getRowClass(data: Expense) {
  if (!data.createdBy) return 'row-unknown';
  return `row-${data.createdBy.toLowerCase()}`;
}

async function searchShops(event: any) {
  try {
    const response = await autocompleteApi.getShops(event.query);
    shopSuggestions.value = response.suggestions.map((s: any) => s.value);
  } catch (error) {
    console.error('Failed to load shop suggestions:', error);
    shopSuggestions.value = [];
  }
}

async function searchCategories(event: any) {
  try {
    const response = await autocompleteApi.getCategories(event.query);
    categorySuggestions.value = response.suggestions.map((s: any) => s.value);
  } catch (error) {
    console.error('Failed to load category suggestions:', error);
    categorySuggestions.value = [];
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dayBeforeYesterday = new Date(today);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) {
    return 'Danas';
  } else if (compareDate.getTime() === yesterday.getTime()) {
    return 'Juče';
  } else if (compareDate.getTime() === dayBeforeYesterday.getTime()) {
    return 'Prekjuče';
  }

  return date.toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatAmount(amount: number, showDecimals: boolean = true): string {
  return amount.toLocaleString('sr-RS', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  });
}

function getMonthNameLatin(date: Date): string {
  const monthNames = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];

  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function openEditDialog(expense: Expense) {
  expenseToEdit.value = expense;
  editDialogVisible.value = true;
}

function handleEditSuccess() {
  editDialogVisible.value = false;
  expenseToEdit.value = null;
  fetchExpenses();
}

function confirmDelete(expense: Expense) {
  expenseToDelete.value = expense;
  deleteDialogVisible.value = true;
}

async function deleteExpense() {
  if (!expenseToDelete.value) return;

  deleting.value = true;

  try {
    await expensesStore.deleteExpense(expenseToDelete.value.id);
    toast.add({
      severity: 'success',
      summary: 'Uspešno!',
      detail: 'Trošak je obrisan',
      life: 3000
    });
    deleteDialogVisible.value = false;
    expenseToDelete.value = null;
    fetchExpenses();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Greška',
      detail: error.response?.data?.message || 'Nije moguće obrisati trošak',
      life: 5000
    });
  } finally {
    deleting.value = false;
  }
}

async function fetchMonthlySummaries() {
  loadingSummaries.value = true;
  try {
    const summaries: MonthlySummary[] = [];
    const today = new Date();

    // Get last 3 months
    for (let i = 0; i < 3; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      const params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 1000 // Get all expenses for the month
      };

      // Use direct API call to avoid modifying the store
      const response = await expenseApi.getAll(params);

      const totalRsd = response.data.reduce((sum, expense) => sum + expense.rsdAmount, 0);
      const totalEur = response.data.reduce((sum, expense) => sum + expense.eurAmount, 0);

      summaries.push({
        month: `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`,
        monthName: getMonthNameLatin(monthDate),
        totalRsd,
        totalEur
      });
    }

    monthlySummaries.value = summaries;
  } catch (error) {
    console.error('Failed to load monthly summaries:', error);
  } finally {
    loadingSummaries.value = false;
  }
}

onMounted(() => {
  fetchMonthlySummaries();
  fetchExpenses();
});
</script>

<style scoped>
.expense-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.list-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.filters-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.filters-toggle {
  color: var(--primary-color);
  font-weight: 500;
}

.active-filters-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.5rem;
  background: var(--primary-color);
  color: white;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.monthly-summaries {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 4px 12px var(--primary-shadow);
  transition: transform 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--primary-shadow);
}

.summary-card.loading {
  opacity: 0.6;
  pointer-events: none;
}

.summary-month {
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.summary-amount-row {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.summary-amount {
  font-size: 1.5rem;
  font-weight: 700;
}

.summary-currency {
  font-size: 0.875rem;
  font-weight: 600;
}

.summary-amount-secondary {
  font-size: 0.875rem;
  opacity: 0.8;
}

.filters-section {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.quick-filters {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.month-navigation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.month-nav-btn {
  color: var(--primary-color);
}

.current-month {
  font-weight: 600;
  color: var(--text-primary);
  min-width: 120px;
  text-align: center;
  font-size: 0.9375rem;
}

.person-pills {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.person-pill {
  padding: 0.5rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 2rem;
  background: white;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.person-pill:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.person-pill.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.more-filters-btn {
  margin-left: auto;
  position: relative;
  color: var(--primary-color);
}

.filter-count-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 700;
}

.advanced-filters-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 1rem;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-input {
  width: 100%;
}

.filter-actions {
  display: flex;
  align-items: flex-end;
}

.table-wrapper {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.expenses-table {
  width: 100%;
}

.expenses-table :deep(table) {
  min-width: 1100px;
  width: 100%;
}

.expenses-table :deep(.p-datatable-wrapper) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.expenses-table :deep(.row-svetla td:first-child) {
  border-left: 4px solid #a855f7 !important;
}

.expenses-table :deep(.row-dejan td:first-child) {
  border-left: 4px solid #10b981 !important;
}

.expenses-table :deep(.row-unknown td:first-child) {
  border-left: 4px solid #9ca3af !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  font-size: 1rem;
  margin: 0;
}

.amount-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.amount-primary {
  font-weight: 600;
  color: var(--text-primary);
}

.amount-secondary {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: nowrap;
}

.category-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--primary-light);
  color: var(--primary-dark);
  border-radius: 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
}

.person-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
}

.person-badge.svetla {
  background: #faf5ff;
  color: #7c3aed;
}

.person-badge.dejan {
  background: #ecfdf5;
  color: #059669;
}

.person-badge.unknown {
  background: #f3f4f6;
  color: #6b7280;
}

.manual-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .expense-list {
    padding: 1rem 0.5rem;
  }

  .monthly-summaries {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.375rem;
    margin-bottom: 1rem;
  }

  .summary-card {
    padding: 0.5rem 0.375rem;
    box-shadow: 0 2px 8px var(--primary-shadow);
  }

  .summary-card:hover {
    transform: none;
  }

  .summary-month {
    font-size: 0.625rem;
    margin-bottom: 0.125rem;
    line-height: 1.2;
  }

  .summary-amount-row {
    gap: 0.125rem;
  }

  .summary-amount {
    font-size: 0.875rem;
    line-height: 1.2;
  }

  .summary-currency {
    font-size: 0.625rem;
  }

  .summary-amount-secondary {
    font-size: 0.625rem;
    line-height: 1.2;
  }

  .quick-filters {
    padding: 0.5rem 0.375rem;
    gap: 0.5rem;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .month-navigation {
    flex-shrink: 0;
    gap: 0.25rem;
  }

  .month-nav-btn {
    padding: 0.25rem;
  }

  .current-month {
    font-size: 0.75rem;
    min-width: 80px;
  }

  .person-pills {
    flex-shrink: 0;
    gap: 0.375rem;
  }

  .person-pill {
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .more-filters-btn {
    margin-left: auto;
    flex-shrink: 0;
  }

  .list-title {
    font-size: 1.25rem;
    padding: 0 0.5rem;
  }

  .table-wrapper {
    margin: 0 -0.5rem;
    border-radius: 0;
    max-width: 100vw;
  }

  .expenses-table {
    font-size: 0.8125rem;
  }

  .expenses-table :deep(.p-datatable-wrapper) {
    overflow-x: auto !important;
  }

  .amount-cell {
    white-space: nowrap;
  }

  /* Mobile Landscape: Optimize table for horizontal space */
  @media (orientation: landscape) {
    .table-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .expenses-table :deep(.p-datatable-wrapper) {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
    }

    .list-title {
      font-size: 1rem;
      padding: 0 0.375rem;
    }

    .monthly-summaries {
      padding: 0.375rem 0.5rem;
      gap: 0.5rem;
    }

    .summary-card {
      padding: 0.5rem;
      min-width: 90px;
    }

    .summary-month {
      font-size: 0.6875rem;
      margin-bottom: 0.125rem;
    }

    .summary-amount {
      font-size: 0.875rem;
    }

    .summary-currency {
      font-size: 0.625rem;
    }

    .summary-amount-secondary {
      font-size: 0.5625rem;
    }

    .quick-filters {
      padding: 0.375rem;
      gap: 0.375rem;
    }

    .month-navigation {
      gap: 0.125rem;
    }

    .month-nav-btn {
      padding: 0.125rem;
      width: 2rem;
      height: 2rem;
    }

    .current-month {
      font-size: 0.6875rem;
      min-width: 70px;
    }

    .person-pill {
      padding: 0.25rem 0.5rem;
      font-size: 0.6875rem;
    }

    .expenses-table {
      font-size: 0.75rem;
    }

    .expenses-table :deep(.p-datatable-header),
    .expenses-table :deep(.p-datatable-thead > tr > th) {
      padding: 0.375rem 0.5rem;
      font-size: 0.6875rem;
    }

    .expenses-table :deep(.p-datatable-tbody > tr > td) {
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
    }

    .expenses-table :deep(.p-button) {
      width: 1.75rem;
      height: 1.75rem;
    }

    .expenses-table :deep(.p-button .p-icon) {
      font-size: 0.75rem;
    }

    .amount-primary {
      font-size: 0.75rem;
    }

    .amount-secondary {
      font-size: 0.625rem;
    }

    .category-badge {
      padding: 0.125rem 0.375rem;
      font-size: 0.625rem;
    }

    .person-badge {
      padding: 0.125rem 0.375rem;
      font-size: 0.625rem;
    }

    .expenses-table :deep(.p-tag) {
      padding: 0.125rem 0.375rem;
      font-size: 0.625rem;
    }

    .expenses-table :deep(.p-tag .p-tag-icon) {
      font-size: 0.625rem;
      margin-right: 0.125rem;
    }

    .expenses-table :deep(.p-paginator) {
      padding: 0.375rem;
      font-size: 0.6875rem;
    }

    .expenses-table :deep(.p-paginator .p-paginator-pages .p-paginator-page) {
      min-width: 1.75rem;
      height: 1.75rem;
      font-size: 0.6875rem;
    }

    .expenses-table :deep(.p-paginator .p-paginator-icon) {
      width: 1.75rem;
      height: 1.75rem;
    }
  }
}
</style>
