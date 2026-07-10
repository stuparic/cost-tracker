<template>
  <div class="income-list">
    <!-- Monthly Summaries -->
    <div class="monthly-summaries">
      <div
        v-for="month in monthlySummaries"
        :key="month.month"
        class="summary-card income-card"
        :class="{ active: month.month === viewedMonthKey }"
      >
        <div class="month-name">{{ month.monthName }}</div>
        <div class="amount-row">
          <span class="amount-primary">{{ formatRSD(month.totalRsd) }}</span>
          <span class="currency-label">RSD</span>
        </div>
        <div class="amount-secondary">{{ formatEUR(month.totalEur) }} EUR</div>
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
        <div class="person-pills">
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
        </div>
        <Button label="Filteri" icon="pi pi-filter" outlined class="income-button" @click="filtersVisible = true" />
      </div>
    </div>

    <!-- Mobile card list (shown instead of the table on phones) -->
    <div class="mobile-cards">
      <SkeletonCards v-if="incomesStore.loading" />
      <ListEmptyState
        v-else-if="incomesStore.incomes.length === 0"
        :message="`Nema prihoda za ${currentMonthDisplay}`"
        cta-to="/income/add"
        cta-label="Dodaj prihod"
        button-class="income-button"
      />
      <template v-else>
        <div
          v-for="income in incomesStore.incomes"
          :key="income.id"
          class="mobile-card"
          :class="`card-${(income.createdBy || 'unknown').toLowerCase()}`"
        >
          <div class="mobile-card-top">
            <span class="mobile-card-source">{{ income.source }}</span>
            <span class="mobile-card-amount">{{ formatRSD(income.rsdAmount) }} RSD</span>
          </div>
          <div class="mobile-card-mid">
            <span>{{ formatDate(income.dateReceived) }}</span>
            <span class="type-chip">{{ incomeTypeLabels[income.incomeType as IncomeType] || income.incomeType }}</span>
            <span class="mobile-card-eur">{{ formatEUR(income.eurAmount) }} EUR</span>
          </div>
          <div class="mobile-card-bottom">
            <span class="mobile-card-desc">{{ income.description || '-' }}</span>
            <div class="mobile-card-actions">
              <span class="person-badge" :class="`person-${income.createdBy?.toLowerCase()}`">{{ income.createdBy }}</span>
              <Button icon="pi pi-pencil" text rounded size="small" aria-label="Izmeni" @click="editIncome(income)" />
              <Button icon="pi pi-trash" text rounded severity="danger" size="small" aria-label="Obriši" @click="confirmDelete(income)" />
            </div>
          </div>
        </div>
        <MobilePagination
          :page="incomesStore.pagination.page"
          :total-pages="incomesStore.pagination.totalPages"
          @change="applyFilters"
        />
      </template>
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
      <template #empty>
        <ListEmptyState
          :message="`Nema prihoda za ${currentMonthDisplay}`"
          cta-to="/income/add"
          cta-label="Dodaj prihod"
          button-class="income-button"
        />
      </template>

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
import Paginator, { type PageState } from 'primevue/paginator';
import Sidebar from 'primevue/sidebar';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';
import EditIncomeDialog from './EditIncomeDialog.vue';
import ListEmptyState from './shared/ListEmptyState.vue';
import SkeletonCards from './shared/SkeletonCards.vue';
import MobilePagination from './shared/MobilePagination.vue';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';
import { useMonthlySummaries } from '@/composables/useMonthlySummaries';
import { useIncomesStore } from '@/stores/incomes';
import { useAuthStore } from '@/stores/auth';
import { incomeApi } from '@/api/incomes';
import type { Income, IncomeType, QueryIncomesDto } from '@/types/income';
import { incomeTypeLabels } from '@/types/income';

const incomesStore = useIncomesStore();
const confirm = useConfirm();
const toast = useToast();
const { formatRelativeDate: formatDate, formatNumber, formatMonthYear } = useTransactionFormatting();

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
const authStore = useAuthStore();
const personFilters = computed(() => [
  { label: 'Sve', value: 'all' },
  ...(authStore.household?.members ?? []).map(member => {
    const first = member.displayName.split(' ')[0] || member.displayName;
    return { label: first, value: first };
  })
]);

// Income type options for dropdown
const incomeTypeOptions = [
  { label: 'Svi tipovi', value: '' },
  ...Object.entries(incomeTypeLabels).map(([value, label]) => ({ label, value }))
];

// Monthly summaries (shared with ExpenseList via composable)
const {
  summaries: monthlySummaries,
  viewedMonthKey,
  refresh: fetchMonthlySummaries
} = useMonthlySummaries(currentMonth, async (startDate, endDate) => {
  const response = await incomeApi.getAll({ startDate, endDate, limit: 1000 });
  return {
    rsd: response.data.reduce((sum, income) => sum + income.rsdAmount, 0),
    eur: response.data.reduce((sum, income) => sum + income.eurAmount, 0)
  };
});

const currentMonthDisplay = computed(() => formatMonthYear(currentMonth.value));

// Navigation
function previousMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1);
  applyFilters();
}

function nextMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
  applyFilters();
}

// Filters
function applyFilters(page = 1) {
  const startDate = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
  const endDate = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0, 23, 59, 59);

  const params: QueryIncomesDto = {
    page,
    limit: 20,
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

  const params: QueryIncomesDto = {
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
function onPageChange(event: PageState) {
  applyFilters(event.page + 1);
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
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', outlined: true },
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

// Formatting (shared helpers; RSD shown without decimals, EUR with)
const formatRSD = (amount: number) => formatNumber(amount, false);
const formatEUR = (amount: number) => formatNumber(amount, true);

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
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.month-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.375rem;
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
  letter-spacing: -0.01em;
  color: var(--income-color);
}

.currency-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.amount-secondary {
  font-size: 0.75rem;
  color: var(--text-secondary);
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
  padding: 0.4rem 0.875rem;
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

.person-pill.income-pill:hover {
  color: var(--income-color);
}

.person-pill.income-pill.active {
  background: var(--surface-card);
  color: var(--income-color);
  box-shadow: var(--shadow-card);
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
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.incomes-table :deep(.p-datatable-wrapper) {
  overflow-x: auto;
}

.incomes-table :deep(table) {
  min-width: 800px;
}

.incomes-table :deep(.row-income-svetla td:first-child) {
  border-left: 3px solid var(--user-svetla-color) !important;
}

.incomes-table :deep(.row-income-dejan td:first-child) {
  border-left: 3px solid var(--user-dejan-color) !important;
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
  background: var(--user-svetla-light);
  color: var(--user-svetla-color);
}

.person-badge.person-dejan {
  background: var(--user-dejan-light);
  color: var(--user-dejan-color);
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

/* Landscape mode for all devices - enable horizontal scrolling */
@media (orientation: landscape) and (max-height: 500px) {
  .income-list {
    min-width: 900px;
    max-width: none;
  }

  .incomes-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .incomes-table :deep(.p-datatable-wrapper) {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }
}
/* === Active (viewed) month summary card === */
.summary-card {
  border-radius: var(--radius-md, 12px);
  transition: all 0.15s ease;
}

.summary-card.active {
  border-color: var(--income-color);
  background: var(--income-light);
}

/* === Mobile card list === */
.mobile-cards {
  display: none;
}

.mobile-card {
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--user-dejan-color);
  border-radius: var(--radius-md, 12px);
  padding: 0.875rem 1rem;
  margin-bottom: 0.75rem;
}

.mobile-card.card-svetla {
  border-left-color: var(--user-svetla-color);
}

.mobile-card-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
}

.mobile-card-source {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-card-amount {
  font-weight: 700;
  font-size: 1rem;
  white-space: nowrap;
  color: var(--income-dark);
}

.mobile-card-mid {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.type-chip {
  background: var(--income-light);
  color: var(--income-dark);
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.mobile-card-eur {
  margin-left: auto;
  font-size: 0.75rem;
}

.mobile-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.375rem;
}

.mobile-card-desc {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.mobile-card-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

/* Phones: cards instead of a horizontally scrolling table */
@media (max-width: 640px) {
  .mobile-cards {
    display: block;
  }

  .incomes-table,
  .income-paginator {
    display: none;
  }
}
/* Phones: summary cards swipe horizontally instead of being squeezed */
@media (max-width: 640px) {
  .monthly-summaries {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-padding: 0 1rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 0.75rem;
    margin-left: -1rem;
    margin-right: -1rem;
    padding: 0.25rem 1rem;
  }

  .monthly-summaries::-webkit-scrollbar {
    display: none;
  }

  .monthly-summaries .summary-card {
    flex: 0 0 70%;
    scroll-snap-align: start;
  }

  .filters-row {
    scrollbar-width: none;
  }

  .filters-row::-webkit-scrollbar {
    display: none;
  }
}
</style>
