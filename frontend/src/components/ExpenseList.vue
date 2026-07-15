<template>
  <div class="expense-list">
    <h2 class="list-title">Lista troškova</h2>

    <!-- Monthly Summaries -->
    <div class="monthly-summaries">
      <div
        v-for="summary in monthlySummaries"
        :key="summary.month"
        class="summary-card"
        role="button"
        tabindex="0"
        :class="{ loading: loadingSummaries, active: summary.month === viewedMonthKey }"
        @click="goToMonth(summary.month)"
        @keydown.enter="goToMonth(summary.month)"
        @keydown.space.prevent="goToMonth(summary.month)"
      >
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
          <label class="filter-label">Prodavnica/Usluga</label>
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

    <!-- Mobile card list (shown instead of the table on phones) -->
    <div class="mobile-cards">
      <SkeletonCards v-if="expensesStore.loading" />
      <ListEmptyState
        v-else-if="expensesStore.expenses.length === 0"
        :message="`Nema troškova za ${currentMonthLabel}`"
        cta-to="/add"
        cta-label="Dodaj trošak"
      />
      <template v-else>
        <div
          v-for="expense in expensesStore.expenses"
          :key="expense.id"
          class="mobile-card clickable"
          :class="`card-${(expense.createdBy || 'unknown').toLowerCase()}`"
          @click="openDetail(expense)"
        >
          <div class="mobile-card-top">
            <span class="mobile-card-shop">{{ expense.shopName }}</span>
            <span class="mobile-card-amount">{{ formatAmount(expense.rsdAmount, false) }} RSD</span>
          </div>
          <div class="mobile-card-mid">
            <span class="mobile-card-date">{{ formatDate(expense.purchaseDate) }}</span>
            <span class="inline-category" @click.stop>
              <CategorySelect :model-value="expense.category" @update:model-value="changeCategory(expense, $event)" />
            </span>
            <span class="mobile-card-eur">{{ formatAmount(expense.eurAmount, true) }} EUR</span>
          </div>
          <div class="mobile-card-bottom">
            <span class="mobile-card-desc">{{ expense.productDescription }}</span>
            <div class="mobile-card-actions">
              <span class="person-badge" :class="(expense.createdBy || 'unknown').toLowerCase()">{{ expense.createdBy }}</span>
              <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" aria-label="Izmeni" @click.stop="openEditDialog(expense)" />
              <Button icon="pi pi-trash" severity="danger" text rounded size="small" aria-label="Obriši" @click.stop="confirmDelete(expense)" />
            </div>
          </div>
        </div>
        <MobilePagination
          :page="expensesStore.pagination.page"
          :total-pages="expensesStore.pagination.totalPages"
          @change="fetchExpenses"
        />
      </template>
    </div>

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
        class="expenses-table clickable-rows"
        striped-rows
        :row-class="getRowClass"
        @page="onPageChange"
        @row-click="openDetail($event.data)"
      >
        <template #empty>
          <ListEmptyState :message="`Nema troškova za ${currentMonthLabel}`" cta-to="/add" cta-label="Dodaj trošak" />
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

        <Column field="category" header="Kategorija" :sortable="true" style="min-width: 170px">
          <template #body="{ data }">
            <span class="inline-category" @click.stop>
              <CategorySelect :model-value="data.category" @update:model-value="changeCategory(data, $event)" />
            </span>
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
              <Button v-tooltip.top="'Izmeni'" icon="pi pi-pencil" severity="secondary" text rounded @click.stop="openEditDialog(data)" />
              <Button v-tooltip.top="'Obriši'" icon="pi pi-trash" severity="danger" text rounded @click.stop="confirmDelete(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Detail Dialog (read-only) -->
    <ExpenseDetailDialog
      v-if="expenseToView"
      v-model:visible="detailDialogVisible"
      :expense="expenseToView"
      @edit="handleDetailEdit"
      @delete="handleDetailDelete"
    />

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
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'primevue/usetoast';
import { autocompleteApi } from '@/api/autocomplete';
import { expenseApi } from '@/api/expenses';
import type { Expense, QueryExpensesDto } from '@/types/expense';
import { getApiErrorMessage } from '@/api/client';
import DataTable, { type DataTablePageEvent } from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Sidebar from 'primevue/sidebar';
import EditExpenseDialog from './EditExpenseDialog.vue';
import ExpenseDetailDialog from './ExpenseDetailDialog.vue';
import CategorySelect from './shared/CategorySelect.vue';
import ListEmptyState from './shared/ListEmptyState.vue';
import SkeletonCards from './shared/SkeletonCards.vue';
import MobilePagination from './shared/MobilePagination.vue';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';
import { useMonthlySummaries } from '@/composables/useMonthlySummaries';

const toast = useToast();
const expensesStore = useExpensesStore();
const { formatRelativeDate: formatDate, formatNumber: formatAmount, formatMonthYear } = useTransactionFormatting();

// Current month tracking
const currentMonth = ref(new Date());

// Compute date range from current month
const dateRange = computed(() => {
  const start = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
  const end = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0, 23, 59, 59);
  return [start, end];
});

// Current month label
const currentMonthLabel = computed(() => formatMonthYear(currentMonth.value));

// Filters
const filters = reactive({
  createdBy: '',
  shopName: '',
  category: ''
});

// Person filter options come from the household members
const authStore = useAuthStore();
const personOptions = computed(() => [
  { label: 'Sve', value: '' },
  ...(authStore.household?.members ?? []).map(member => {
    const first = member.displayName.split(' ')[0] || member.displayName;
    return { label: first, value: first };
  })
]);

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

const detailDialogVisible = ref(false);
const expenseToView = ref<Expense | null>(null);

// Monthly summaries (shared with IncomeList via composable)
const {
  summaries: monthlySummaries,
  loading: loadingSummaries,
  viewedMonthKey,
  refresh: fetchMonthlySummaries
} = useMonthlySummaries(currentMonth, async (startDate, endDate) => {
  const response = await expenseApi.getAll({ startDate, endDate, limit: 1000 });
  return {
    rsd: response.data.reduce((sum, expense) => sum + expense.rsdAmount, 0),
    eur: response.data.reduce((sum, expense) => sum + expense.eurAmount, 0)
  };
});

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
  const params: QueryExpensesDto = {
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

function onPageChange(event: DataTablePageEvent) {
  fetchExpenses(event.page + 1);
}

function navigateMonth(direction: number) {
  const newMonth = new Date(currentMonth.value);
  newMonth.setMonth(newMonth.getMonth() + direction);
  currentMonth.value = newMonth;
}

/** Jumps straight to a month tapped in the summary cards. Key format: "YYYY-M". */
function goToMonth(monthKeyValue: string) {
  const [year, month] = monthKeyValue.split('-').map(Number);
  if (!year || !month) return;
  currentMonth.value = new Date(year, month - 1, 1);
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

async function searchShops(event: AutoCompleteCompleteEvent) {
  try {
    const response = await autocompleteApi.getShops(event.query);
    shopSuggestions.value = response.suggestions.map(s => s.value);
  } catch (error) {
    console.error('Failed to load shop suggestions:', error);
    shopSuggestions.value = [];
  }
}

async function searchCategories(event: AutoCompleteCompleteEvent) {
  try {
    const response = await autocompleteApi.getCategories(event.query);
    categorySuggestions.value = response.suggestions.map(s => s.value);
  } catch (error) {
    console.error('Failed to load category suggestions:', error);
    categorySuggestions.value = [];
  }
}

function openDetail(expense: Expense) {
  expenseToView.value = expense;
  detailDialogVisible.value = true;
}

function handleDetailEdit(expense: Expense) {
  detailDialogVisible.value = false;
  openEditDialog(expense);
}

function handleDetailDelete(expense: Expense) {
  detailDialogVisible.value = false;
  confirmDelete(expense);
}

/** Inline category change from a list row; persists and re-learns server-side. */
async function changeCategory(expense: Expense, category: string) {
  if (!category || category === expense.category) return;
  try {
    await expenseApi.update(expense.id, { category });
    await fetchExpenses(expensesStore.pagination.page);
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Greška', detail: getApiErrorMessage(error, 'Nije moguće promeniti kategoriju'), life: 4000 });
  }
}

function openEditDialog(expense: Expense) {
  expenseToEdit.value = expense;
  editDialogVisible.value = true;
}

function handleEditSuccess() {
  editDialogVisible.value = false;
  expenseToEdit.value = null;
  fetchExpenses();
  fetchMonthlySummaries();
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
    fetchMonthlySummaries();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Greška',
      detail: getApiErrorMessage(error, 'Nije moguće obrisati trošak'),
      life: 5000
    });
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  fetchMonthlySummaries();
  fetchExpenses();
});
</script>

<style scoped>
.expense-list {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.5rem 1.25rem 1.5rem;
}

.list-title {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
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

.clickable {
  cursor: pointer;
}

.clickable-rows :deep(tbody tr) {
  cursor: pointer;
}

.inline-category {
  display: inline-flex;
  max-width: 12rem;
  width: 100%;
}

.summary-card {
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  transition: all 0.15s;
  cursor: pointer;
}

.summary-card:hover {
  border-color: var(--primary-color);
}

.summary-card:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.summary-card.loading {
  opacity: 0.6;
  pointer-events: none;
}

.summary-month {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.375rem;
}

.summary-amount-row {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.summary-amount {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.summary-currency {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.summary-amount-secondary {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.filters-section {
  background: var(--surface-card);
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
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.month-navigation {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0.2rem 0.375rem;
}

.month-nav-btn {
  color: var(--text-secondary);
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
  gap: 4px;
  padding: 4px;
  background: var(--surface-hover);
  border-radius: 999px;
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

.person-pill:hover {
  color: var(--primary-color);
}

.person-pill.active {
  background: var(--surface-card);
  color: var(--primary-color);
  box-shadow: var(--shadow-card);
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
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  width: 100%;
  overflow: hidden;
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
  border-left: 3px solid var(--user-svetla-color) !important;
}

.expenses-table :deep(.row-dejan td:first-child) {
  border-left: 3px solid var(--user-dejan-color) !important;
}

.expenses-table :deep(.row-unknown td:first-child) {
  border-left: 3px solid var(--user-unknown-color) !important;
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
  background: var(--user-svetla-light);
  color: var(--user-svetla-color);
}

.person-badge.dejan {
  background: var(--user-dejan-light);
  color: var(--user-dejan-color);
}

.person-badge.unknown {
  background: var(--user-unknown-light);
  color: var(--user-unknown-color);
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
    padding: 0.625rem 0.75rem;
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
  @media (orientation: landscape) and (max-height: 500px) {
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

/* Landscape mode for all devices - enable horizontal scrolling */
@media (orientation: landscape) and (max-height: 500px) {
  .expense-list {
    min-width: 1100px;
    max-width: none;
  }

  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .expenses-table :deep(.p-datatable-wrapper) {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }
}
/* === Active (viewed) month summary card === */
.summary-card.active {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.summary-card.active .summary-amount {
  color: var(--primary-dark);
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

.mobile-card-shop {
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
  color: var(--expense-color);
}

.mobile-card-mid {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
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

  .table-wrapper {
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

  .quick-filters {
    scrollbar-width: none;
  }

  .quick-filters::-webkit-scrollbar {
    display: none;
  }
}
</style>
