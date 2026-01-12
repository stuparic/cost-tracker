<template>
  <div class="expense-list">
    <h2 class="list-title">Lista troškova</h2>

    <!-- Monthly Summaries -->
    <div class="monthly-summaries">
      <div
        v-for="summary in monthlySummaries"
        :key="summary.month"
        class="summary-card"
        :class="{ 'loading': loadingSummaries }"
      >
        <div class="summary-month">{{ summary.monthName }}</div>
        <div class="summary-amount">{{ formatAmount(summary.totalRsd) }} RSD</div>
        <div class="summary-amount-secondary">{{ formatAmount(summary.totalEur) }} EUR</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-field">
        <label class="filter-label">Osoba</label>
        <Select
          v-model="filters.createdBy"
          :options="personOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Sve"
          class="filter-select"
        />
      </div>

      <div class="filter-field">
        <label class="filter-label">Prodavnica</label>
        <AutoComplete
          v-model="filters.shopName"
          :suggestions="shopSuggestions"
          @complete="searchShops"
          placeholder="Pretraži prodavnicu"
          class="filter-input"
        />
      </div>

      <div class="filter-field">
        <label class="filter-label">Kategorija</label>
        <AutoComplete
          v-model="filters.category"
          :suggestions="categorySuggestions"
          @complete="searchCategories"
          placeholder="Pretraži kategoriju"
          class="filter-input"
        />
      </div>

      <div class="filter-field">
        <label class="filter-label">Period</label>
        <DatePicker
          v-model="dateRange"
          selectionMode="range"
          :manualInput="false"
          placeholder="Od - Do"
          dateFormat="dd.mm.yy"
          class="filter-date"
        />
      </div>

      <div class="filter-actions">
        <Button
          label="Očisti filtere"
          icon="pi pi-filter-slash"
          @click="clearFilters"
          severity="secondary"
          text
        />
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-wrapper">
      <DataTable
        :value="expensesStore.expenses"
        :loading="expensesStore.loading"
        :paginator="true"
        :rows="20"
        :totalRecords="expensesStore.pagination.total"
        :lazy="true"
        @page="onPageChange"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="Prikazano {first} do {last} od {totalRecords} troškova"
        class="expenses-table"
        stripedRows
      >
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox"></i>
          <p>Nema troškova za prikaz</p>
        </div>
      </template>

      <Column field="purchaseDate" header="Datum" :sortable="true">
        <template #body="{ data }">
          {{ formatDate(data.purchaseDate) }}
        </template>
      </Column>

      <Column field="shopName" header="Prodavnica" :sortable="true" />

      <Column field="category" header="Kategorija" :sortable="true">
        <template #body="{ data }">
          <span class="category-badge">{{ data.category }}</span>
        </template>
      </Column>

      <Column field="productDescription" header="Opis" />

      <Column field="amount" header="Iznos" :sortable="true">
        <template #body="{ data }">
          <div class="amount-cell">
            <span class="amount-primary">{{ formatAmount(data.rsdAmount) }} RSD</span>
            <span class="amount-secondary">{{ formatAmount(data.eurAmount) }} EUR</span>
          </div>
        </template>
      </Column>

      <Column field="createdBy" header="Osoba" :sortable="true">
        <template #body="{ data }">
          <span class="person-badge" :class="data.createdBy ? data.createdBy.toLowerCase() : 'unknown'">
            {{ data.createdBy || 'Nepoznato' }}
          </span>
        </template>
      </Column>

      <Column header="Akcije">
        <template #body="{ data }">
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            @click="confirmDelete(data)"
            v-tooltip.top="'Obriši'"
          />
        </template>
      </Column>
      </DataTable>
    </div>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="deleteDialogVisible"
      header="Potvrdi brisanje"
      :modal="true"
      class="delete-dialog"
    >
      <p>Da li ste sigurni da želite da obrišete ovaj trošak?</p>
      <template #footer>
        <Button label="Otkaži" severity="secondary" @click="deleteDialogVisible = false" />
        <Button label="Obriši" severity="danger" @click="deleteExpense" :loading="deleting" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { useExpensesStore } from '@/stores/expenses';
import { useToast } from 'primevue/usetoast';
import { autocompleteApi } from '@/api/autocomplete';
import { expenseApi } from '@/api/expenses';
import type { Expense } from '@/types/expense';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import AutoComplete from 'primevue/autocomplete';
import Dialog from 'primevue/dialog';

const toast = useToast();
const expensesStore = useExpensesStore();

// Get current month start/end dates
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

// Filters
const filters = reactive({
  createdBy: '',
  shopName: '',
  category: '',
});

const dateRange = ref<Date[]>([startOfMonth, endOfMonth]);

// Person filter options
const personOptions = [
  { label: 'Sve', value: '' },
  { label: 'Svetla', value: 'Svetla' },
  { label: 'Dejan', value: 'Dejan' },
];

// Autocomplete suggestions
const shopSuggestions = ref<string[]>([]);
const categorySuggestions = ref<string[]>([]);

// Delete dialog
const deleteDialogVisible = ref(false);
const expenseToDelete = ref<Expense | null>(null);
const deleting = ref(false);

// Monthly summaries
interface MonthlySummary {
  month: string;
  monthName: string;
  totalRsd: number;
  totalEur: number;
}

const monthlySummaries = ref<MonthlySummary[]>([]);
const loadingSummaries = ref(false);

// Fetch expenses when filters change (but not on initial mount)
watch([filters, dateRange], () => {
  fetchExpenses();
}, { deep: true, immediate: false });

async function fetchExpenses(page = 1) {
  const params: any = {
    page,
    limit: 20,
  };

  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    params.startDate = dateRange.value[0].toISOString();
    params.endDate = dateRange.value[1].toISOString();
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

function clearFilters() {
  filters.createdBy = '';
  filters.shopName = '';
  filters.category = '';
  dateRange.value = [startOfMonth, endOfMonth];
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
    year: 'numeric',
  });
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getMonthNameLatin(date: Date): string {
  const monthNames = [
    'Januar',
    'Februar',
    'Mart',
    'April',
    'Maj',
    'Jun',
    'Jul',
    'Avgust',
    'Septembar',
    'Oktobar',
    'Novembar',
    'Decembar',
  ];

  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
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
      life: 3000,
    });
    deleteDialogVisible.value = false;
    expenseToDelete.value = null;
    fetchExpenses();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Greška',
      detail: error.response?.data?.message || 'Nije moguće obrisati trošak',
      life: 5000,
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
        limit: 1000, // Get all expenses for the month
      };

      // Use direct API call to avoid modifying the store
      const response = await expenseApi.getAll(params);

      const totalRsd = response.data.reduce((sum, expense) => sum + expense.rsdAmount, 0);
      const totalEur = response.data.reduce((sum, expense) => sum + expense.eurAmount, 0);

      summaries.push({
        month: `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`,
        monthName: getMonthNameLatin(monthDate),
        totalRsd,
        totalEur,
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
  margin-bottom: 1.5rem;
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

.summary-amount {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
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

.filter-select,
.filter-input,
.filter-date {
  width: 100%;
}

.filter-actions {
  display: flex;
  align-items: flex-end;
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.expenses-table {
  min-width: 800px;
  width: 100%;
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

/* Mobile responsiveness */
@media (max-width: 768px) {
  .expense-list {
    padding: 1rem 0.5rem;
  }

  .monthly-summaries {
    grid-template-columns: 1fr;
  }

  .filters-section {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .list-title {
    font-size: 1.25rem;
    padding: 0 0.5rem;
  }

  .table-wrapper {
    margin: 0 -0.5rem;
    border-radius: 0;
  }

  .expenses-table {
    font-size: 0.875rem;
  }

  .amount-cell {
    white-space: nowrap;
  }
}
</style>
