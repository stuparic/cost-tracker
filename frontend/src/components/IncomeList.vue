<template>
  <div class="income-list">
    <!-- Monthly Summaries -->
    <div class="monthly-summaries">
      <div v-for="month in monthlySummaries" :key="month.month" class="summary-card income-card">
        <div class="month-name">{{ month.monthName }}</div>
        <div class="amount-row">
          <span class="amount-primary">{{ formatRSD(month.totalRSD) }}</span>
          <span class="currency-label">RSD</span>
        </div>
        <div class="amount-secondary">{{ formatEUR(month.totalEUR) }} EUR</div>
      </div>
    </div>

    <!-- Month Navigation and Filters -->
    <div class="filters-row">
      <div class="month-nav">
        <Button icon="pi pi-chevron-left" text @click="previousMonth" />
        <span class="current-month">{{ currentMonthDisplay }}</span>
        <Button icon="pi pi-chevron-right" text @click="nextMonth" />
      </div>

      <div class="quick-filters">
        <button
          v-for="person in personFilters"
          :key="person.value"
          class="person-pill income-pill"
          :class="{ active: selectedPerson === person.value }"
          @click="
            selectedPerson = person.value;
            applyFilters();
          "
        >
          {{ person.label }}
        </button>
        <Button label="Filteri" icon="pi pi-filter" outlined class="income-button" @click="filtersVisible = true" />
      </div>
    </div>

    <!-- Data Table -->
    <DataTable
      :value="incomesStore.incomes"
      :loading="incomesStore.loading"
      class="incomes-table"
      striped-rows
      :row-class="getRowClass"
      responsive-layout="scroll"
    >
      <Column field="dateReceived" header="Datum" :sortable="true" style="min-width: 120px">
        <template #body="{ data }">
          <div class="date-cell">
            {{ formatDate(data.dateReceived) }}
          </div>
        </template>
      </Column>

      <Column field="source" header="Izvor" :sortable="true" style="min-width: 150px">
        <template #body="{ data }">
          <div class="source-cell">
            {{ data.source }}
          </div>
        </template>
      </Column>

      <Column field="rsdAmount" header="Iznos" :sortable="true" style="min-width: 140px">
        <template #body="{ data }">
          <div class="amount-cell">
            <div class="primary-amount">{{ formatRSD(data.rsdAmount) }} RSD</div>
            <div class="secondary-amount">{{ formatEUR(data.eurAmount) }} EUR</div>
          </div>
        </template>
      </Column>

      <Column field="incomeType" header="Tip" :sortable="true" style="min-width: 120px">
        <template #body="{ data }">
          <div class="type-cell">
            {{ incomeTypeLabels[data.incomeType as IncomeType] || data.incomeType }}
          </div>
        </template>
      </Column>

      <Column header="Izvor" style="min-width: 100px">
        <template #body="{ data }">
          <Tag v-if="data.recurringOccurrenceId" value="Auto" severity="info" icon="pi pi-replay" />
          <span v-else class="manual-label">Ručno</span>
        </template>
      </Column>

      <Column field="description" header="Opis" style="min-width: 180px">
        <template #body="{ data }">
          <div class="description-cell">
            {{ data.description || '-' }}
          </div>
        </template>
      </Column>

      <Column field="createdBy" header="Osoba" :sortable="true" style="min-width: 100px">
        <template #body="{ data }">
          <div class="person-badge" :class="`person-${data.createdBy?.toLowerCase()}`">
            {{ data.createdBy }}
          </div>
        </template>
      </Column>

      <Column header="Akcije" style="min-width: 120px">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button icon="pi pi-pencil" text class="p-button-sm" @click="editIncome(data)" />
            <Button icon="pi pi-trash" text severity="danger" class="p-button-sm" @click="confirmDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Pagination -->
    <Paginator
      v-if="incomesStore.pagination.totalPages > 1"
      :rows="incomesStore.pagination.limit"
      :total-records="incomesStore.pagination.total"
      :first="(incomesStore.pagination.page - 1) * incomesStore.pagination.limit"
      class="income-paginator"
      @page="onPageChange"
    />

    <!-- Advanced Filters Sidebar -->
    <Sidebar v-model:visible="filtersVisible" position="right" class="filters-sidebar">
      <template #header>
        <h3>Napredno filtriranje</h3>
      </template>

      <div class="filter-field">
        <label>Izvor</label>
        <InputText v-model="advancedFilters.source" placeholder="Izvor prihoda" />
      </div>

      <div class="filter-field">
        <label>Tip prihoda</label>
        <Select
          v-model="advancedFilters.incomeType"
          :options="incomeTypeOptions"
          option-label="label"
          option-value="value"
          placeholder="Svi tipovi"
        />
      </div>

      <div class="filter-actions">
        <Button label="Primeni" class="income-button" @click="applyAdvancedFilters" />
        <Button label="Resetuj" outlined @click="resetFilters" />
      </div>
    </Sidebar>

    <!-- Edit Income Dialog -->
    <EditIncomeDialog v-model:visible="editDialogVisible" :income="selectedIncome!" @success="onIncomeUpdated" />

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Paginator from 'primevue/paginator';
import Sidebar from 'primevue/sidebar';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';
import EditIncomeDialog from './EditIncomeDialog.vue';
import { useIncomesStore } from '@/stores/incomes';
import { incomeApi } from '@/api/incomes';
import type { Income, IncomeType } from '@/types/income';
import { incomeTypeLabels } from '@/types/income';

const incomesStore = useIncomesStore();
const confirm = useConfirm();
const toast = useToast();

// Current month filter
const currentMonth = ref(new Date());
const selectedPerson = ref<string>('all');
const filtersVisible = ref(false);

// Advanced filters
const advancedFilters = reactive({
  source: '',
  incomeType: ''
});

// Edit dialog
const editDialogVisible = ref(false);
const selectedIncome = ref<Income | null>(null);

// Person filters
const personFilters = [
  { label: 'Sve', value: 'all' },
  { label: 'Svetla', value: 'Svetla' },
  { label: 'Dejan', value: 'Dejan' }
];

// Income type options for dropdown
const incomeTypeOptions = [
  { label: 'Svi tipovi', value: '' },
  ...Object.entries(incomeTypeLabels).map(([value, label]) => ({ label, value }))
];

// Monthly summaries (last 3 months)
interface MonthlySummary {
  month: string;
  monthName: string;
  totalRSD: number;
  totalEUR: number;
}

const monthlySummaries = ref<MonthlySummary[]>([]);
const loadingSummaries = ref(false);

// Fetch monthly summaries for the last 3 months
async function fetchMonthlySummaries() {
  loadingSummaries.value = true;
  try {
    const summaries: MonthlySummary[] = [];

    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      // Fetch incomes for this month
      const response = await incomeApi.getAll({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 1000 // Get all for this month
      });

      // Calculate totals
      let totalRSD = 0;
      let totalEUR = 0;

      response.data.forEach((income: Income) => {
        totalRSD += income.rsdAmount;
        totalEUR += income.eurAmount;
      });

      summaries.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        monthName: date.toLocaleDateString('sr-Latn', { month: 'long', year: 'numeric' }),
        totalRSD,
        totalEUR
      });
    }

    monthlySummaries.value = summaries;
  } catch (error) {
    console.error('Failed to load monthly summaries:', error);
  } finally {
    loadingSummaries.value = false;
  }
}

const currentMonthDisplay = computed(() => {
  return currentMonth.value.toLocaleDateString('sr-Latn', { month: 'long', year: 'numeric' });
});

// Navigation
function previousMonth() {
  currentMonth.value = new Date(currentMonth.value.setMonth(currentMonth.value.getMonth() - 1));
  applyFilters();
}

function nextMonth() {
  currentMonth.value = new Date(currentMonth.value.setMonth(currentMonth.value.getMonth() + 1));
  applyFilters();
}

// Filters
function applyFilters() {
  const startDate = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
  const endDate = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0, 23, 59, 59);

  const params: any = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    sortBy: 'dateReceived',
    sortOrder: 'desc'
  };

  if (selectedPerson.value !== 'all') {
    params.createdBy = selectedPerson.value;
  }

  incomesStore.fetchIncomes(params);
}

function applyAdvancedFilters() {
  const startDate = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
  const endDate = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0, 23, 59, 59);

  const params: any = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    sortBy: 'dateReceived',
    sortOrder: 'desc'
  };

  if (selectedPerson.value !== 'all') {
    params.createdBy = selectedPerson.value;
  }
  if (advancedFilters.source) {
    params.source = advancedFilters.source;
  }
  if (advancedFilters.incomeType) {
    params.incomeType = advancedFilters.incomeType;
  }

  incomesStore.fetchIncomes(params);
  filtersVisible.value = false;
}

function resetFilters() {
  advancedFilters.source = '';
  advancedFilters.incomeType = '';
  selectedPerson.value = 'all';
  currentMonth.value = new Date();
  applyFilters();
  filtersVisible.value = false;
}

// Pagination
function onPageChange() {
  applyFilters();
}

// CRUD operations
function editIncome(income: Income) {
  selectedIncome.value = income;
  editDialogVisible.value = true;
}

function confirmDelete(income: Income) {
  confirm.require({
    message: `Da li ste sigurni da želite da obrišete ovaj prihod od ${income.source}?`,
    header: 'Potvrda brisanja',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Da, obriši',
    rejectLabel: 'Otkaži',
    accept: async () => {
      try {
        await incomesStore.deleteIncome(income.id);
        toast.add({
          severity: 'success',
          summary: 'Uspešno!',
          detail: 'Prihod je obrisan',
          life: 3000
        });
        applyFilters();
        await fetchMonthlySummaries();
      } catch {
        toast.add({
          severity: 'error',
          summary: 'Greška',
          detail: 'Nije moguće obrisati prihod',
          life: 5000
        });
      }
    }
  });
}

function onIncomeUpdated() {
  editDialogVisible.value = false;
  applyFilters();
  fetchMonthlySummaries();
}

// Formatting
function formatRSD(amount: number): string {
  return Math.round(amount).toLocaleString('sr-RS');
}

function formatEUR(amount: number): string {
  return amount.toFixed(2);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBeforeYesterday = new Date(today);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

  if (date.toDateString() === today.toDateString()) {
    return 'Danas';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Juče';
  } else if (date.toDateString() === dayBeforeYesterday.toDateString()) {
    return 'Prekjuče';
  }

  return date.toLocaleDateString('sr-Latn', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getRowClass(data: Income) {
  if (!data.createdBy) return 'row-unknown';
  return `row-income-${data.createdBy.toLowerCase()}`;
}

// Load initial data
onMounted(() => {
  fetchMonthlySummaries();
  applyFilters();
});
</script>

<style scoped>
.income-list {
  width: 100%;
  max-width: 100%;
  padding: 1.5rem;
  background: var(--background);
}

/* Monthly Summaries */
.monthly-summaries {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  padding: 1rem;
  border-radius: 1rem;
  text-align: center;
}

.income-card {
  background: linear-gradient(135deg, var(--income-color) 0%, var(--income-dark) 100%);
  color: white;
  box-shadow: 0 4px 12px var(--income-shadow);
}

.month-name {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.9;
  margin-bottom: 0.5rem;
  text-transform: capitalize;
}

.amount-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
}

.amount-primary {
  font-size: 1.125rem;
  font-weight: 700;
}

.currency-label {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.9;
}

.amount-secondary {
  font-size: 0.75rem;
  opacity: 0.85;
  margin-top: 0.125rem;
}

/* Filters Row */
.filters-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-month {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 140px;
  text-align: center;
  text-transform: capitalize;
}

.quick-filters {
  display: flex;
  gap: 0.5rem;
  align-items: center;
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

.person-pill.income-pill:hover {
  border-color: var(--income-color);
  color: var(--income-color);
}

.person-pill.income-pill.active {
  background: var(--income-color);
  border-color: var(--income-color);
  color: white;
}

.income-button {
  border-color: var(--income-color) !important;
  color: var(--income-color) !important;
}

.income-button:hover {
  background: var(--income-light) !important;
}

/* Data Table */
.incomes-table {
  background: white;
  border-radius: 0.75rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.incomes-table :deep(.p-datatable-wrapper) {
  overflow-x: auto;
}

.incomes-table :deep(table) {
  min-width: 800px;
}

.incomes-table :deep(.row-income-svetla td:first-child) {
  border-left: 4px solid #a855f7 !important;
}

.incomes-table :deep(.row-income-dejan td:first-child) {
  border-left: 4px solid #10b981 !important;
}

.date-cell {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.source-cell {
  font-weight: 600;
  color: var(--text-primary);
}

.amount-cell {
  text-align: right;
}

.primary-amount {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.secondary-amount {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.125rem;
}

.type-cell {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.description-cell {
  font-size: 0.875rem;
  color: var(--text-secondary);
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.person-badge.person-svetla {
  background: #a855f7;
}

.person-badge.person-dejan {
  background: #10b981;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: nowrap;
}

.manual-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Pagination */
.income-paginator {
  margin-top: 1.5rem;
}

/* Filters Sidebar */
.filters-sidebar {
  width: 350px;
}

.filter-field {
  margin-bottom: 1.5rem;
}

.filter-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9375rem;
}

.filter-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 2rem;
}

.filter-actions button {
  flex: 1;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .income-list {
    padding: 1rem;
  }

  .monthly-summaries {
    gap: 0.5rem;
  }

  .summary-card {
    padding: 0.5rem;
  }

  .month-name {
    font-size: 0.625rem;
    margin-bottom: 0.375rem;
  }

  .amount-row {
    flex-direction: row;
    gap: 0.25rem;
  }

  .amount-primary {
    font-size: 0.875rem;
  }

  .currency-label {
    font-size: 0.625rem;
  }

  .amount-secondary {
    font-size: 0.625rem;
  }

  .filters-row {
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .month-nav,
  .quick-filters {
    width: 100%;
    justify-content: center;
  }

  .current-month {
    font-size: 0.875rem;
  }

  .person-pill {
    padding: 0.4rem 0.875rem;
    font-size: 0.8125rem;
  }

  .incomes-table {
    border-radius: 0.5rem;
  }

  .filters-sidebar {
    width: 90vw;
  }

  /* Mobile Landscape: Optimize table for horizontal space */
  @media (orientation: landscape) {
    .table-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .incomes-table :deep(.p-datatable-wrapper) {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
    }

    .page-title {
      font-size: 1rem;
      padding: 0 0.375rem;
    }

    .summaries {
      padding: 0.375rem 0.5rem;
      gap: 0.5rem;
    }

    .summary-card {
      padding: 0.5rem;
      min-width: 90px;
    }

    .month-name {
      font-size: 0.6875rem;
      margin-bottom: 0.125rem;
    }

    .amount-primary {
      font-size: 0.875rem;
    }

    .currency-label {
      font-size: 0.625rem;
    }

    .amount-secondary {
      font-size: 0.5625rem;
    }

    .filters-row {
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .month-nav {
      gap: 0.125rem;
    }

    .month-nav-btn {
      padding: 0.125rem;
      width: 2rem;
      height: 2rem;
    }

    .current-month {
      font-size: 0.6875rem;
    }

    .person-pill {
      padding: 0.25rem 0.5rem;
      font-size: 0.6875rem;
    }

    .incomes-table {
      font-size: 0.75rem;
    }

    .incomes-table :deep(.p-datatable-header),
    .incomes-table :deep(.p-datatable-thead > tr > th) {
      padding: 0.375rem 0.5rem;
      font-size: 0.6875rem;
    }

    .incomes-table :deep(.p-datatable-tbody > tr > td) {
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
    }

    .incomes-table :deep(.p-button) {
      width: 1.75rem;
      height: 1.75rem;
    }

    .incomes-table :deep(.p-button .p-icon) {
      font-size: 0.75rem;
    }

    .amount-cell .amount-primary {
      font-size: 0.75rem;
    }

    .amount-cell .amount-secondary {
      font-size: 0.625rem;
    }

    .person-badge {
      padding: 0.125rem 0.375rem;
      font-size: 0.625rem;
    }

    .incomes-table :deep(.p-paginator) {
      padding: 0.375rem;
      font-size: 0.6875rem;
    }

    .incomes-table :deep(.p-paginator .p-paginator-pages .p-paginator-page) {
      min-width: 1.75rem;
      height: 1.75rem;
      font-size: 0.6875rem;
    }

    .incomes-table :deep(.p-paginator .p-paginator-icon) {
      width: 1.75rem;
      height: 1.75rem;
    }
  }
}
</style>
