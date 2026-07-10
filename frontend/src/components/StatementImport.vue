<template>
  <div class="statement-import">
    <h2 class="page-title">Uvoz izvoda</h2>
    <p class="page-subtitle">Otpremite PDF izvod iz banke — transakcije koje već postoje biće automatski prepoznate i preskočene.</p>

    <!-- Upload zone -->
    <div
      v-if="!result"
      class="upload-zone"
      :class="{ dragging, parsing }"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
      @click="onZoneClick"
    >
      <input ref="fileInput" type="file" accept="application/pdf,.pdf" hidden @change="onFileChosen" />
      <template v-if="parsing">
        <i class="pi pi-spinner pi-spin upload-icon"></i>
        <p class="upload-text">AI obrađuje izvod…</p>
        <p class="upload-hint">Ovo može potrajati do jednog minuta za veće izvode.</p>
      </template>
      <template v-else>
        <i class="pi pi-file-import upload-icon"></i>
        <p class="upload-text">Prevucite PDF izvod ovde ili kliknite da izaberete</p>
        <p class="upload-hint">Podržani su PDF izvodi (do 15 MB)</p>
      </template>
    </div>

    <!-- Review -->
    <template v-if="result">
      <div class="review-header">
        <div class="review-period">
          <i class="pi pi-calendar"></i>
          <span>Period: {{ formatDate(result.periodStart) }} – {{ formatDate(result.periodEnd) }}</span>
        </div>
        <div class="review-counts">
          <span class="count-chip new">{{ counts.new }} novo</span>
          <span class="count-chip duplicate">{{ counts.duplicate }} duplikata</span>
          <span class="count-chip imported">{{ counts.alreadyImported }} već uvezeno</span>
        </div>
        <Button label="Drugi fajl" icon="pi pi-refresh" outlined size="small" @click="reset" />
      </div>

      <DataTable :value="debits" data-key="ref" class="review-table" :rows="100">
        <Column header-style="width: 3rem">
          <template #header>
            <Checkbox :model-value="allSelected" :binary="true" @update:model-value="toggleAll" />
          </template>
          <template #body="{ data }">
            <Checkbox v-model="selectedRefs" :value="data.ref" :disabled="data.matchStatus === 'already_imported'" />
          </template>
        </Column>
        <Column header="Datum">
          <template #body="{ data }">{{ formatDate(data.date) }}</template>
        </Column>
        <Column header="Prodavnica">
          <template #body="{ data }">
            <div class="merchant-cell">
              <span class="merchant-name">{{ data.merchant }}</span>
              <span class="merchant-raw">{{ data.rawDescription }}</span>
            </div>
          </template>
        </Column>
        <Column header="Kategorija">
          <template #body="{ data }">
            <Select
              v-model="data.category"
              :options="categoryOptions"
              option-label="label"
              option-value="value"
              class="category-select"
              :disabled="data.matchStatus === 'already_imported'"
            />
          </template>
        </Column>
        <Column header="Iznos" header-style="text-align: right">
          <template #body="{ data }">
            <span class="amount">{{ formatAmount(data.amount) }} RSD</span>
          </template>
        </Column>
        <Column header="Status">
          <template #body="{ data }">
            <Tag v-if="data.matchStatus === 'new'" severity="success" value="Novo" />
            <Tag
              v-else-if="data.matchStatus === 'duplicate'"
              v-tooltip.left="data.matchReason"
              severity="warn"
              value="Duplikat"
            />
            <Tag v-else v-tooltip.left="data.matchReason" severity="secondary" value="Već uvezeno" />
          </template>
        </Column>
      </DataTable>

      <template v-if="credits.length > 0">
        <h3 class="section-title">Prilivi (uplate)</h3>
        <p class="page-subtitle">
          Interni transferi, podizanje/uplata gotovine i prebacivanja sa sopstvenog računa su automatski isključeni - ostalo se
          predlaže za uvoz kao prihod.
        </p>
        <DataTable :value="credits" data-key="ref" class="review-table credits-table" :rows="100">
          <Column header-style="width: 3rem">
            <template #header>
              <Checkbox :model-value="allCreditsSelected" :binary="true" @update:model-value="toggleAllCredits" />
            </template>
            <template #body="{ data }">
              <Checkbox v-model="selectedCreditRefs" :value="data.ref" :disabled="data.matchStatus === 'already_imported'" />
            </template>
          </Column>
          <Column header="Datum">
            <template #body="{ data }">{{ formatDate(data.date) }}</template>
          </Column>
          <Column header="Izvor">
            <template #body="{ data }">
              <div class="merchant-cell">
                <span class="merchant-name">{{ data.merchant }}</span>
                <span class="merchant-raw">{{ data.rawDescription }}</span>
              </div>
            </template>
          </Column>
          <Column header="Tip prihoda">
            <template #body="{ data }">
              <Select
                v-model="data.incomeType"
                :options="incomeTypeOptions"
                option-label="label"
                option-value="value"
                class="category-select"
                :disabled="data.matchStatus === 'already_imported'"
              />
            </template>
          </Column>
          <Column header="Iznos" header-style="text-align: right">
            <template #body="{ data }">
              <span class="amount">{{ formatAmount(data.amount) }} RSD</span>
            </template>
          </Column>
          <Column header="Status">
            <template #body="{ data }">
              <Tag v-if="data.matchStatus === 'new'" severity="success" value="Novo" />
              <Tag
                v-else-if="data.matchStatus === 'skipped'"
                v-tooltip.left="data.matchReason"
                severity="secondary"
                value="Preskočeno"
              />
              <Tag v-else v-tooltip.left="data.matchReason" severity="secondary" value="Već uvezeno" />
            </template>
          </Column>
        </DataTable>
      </template>

      <div class="import-footer">
        <template v-if="allImported">
          <div class="import-summary">Sve transakcije iz ovog izvoda su uvezene.</div>
          <Button label="Uvezi novi izvod" icon="pi pi-file-import" @click="reset" />
        </template>
        <template v-else>
          <div class="import-summary">
            Izabrano: <strong>{{ selectedRefs.length + selectedCreditRefs.length }}</strong> transakcija
            <span v-if="selectedRefs.length > 0">— troškovi: <strong>{{ formatAmount(selectedExpenseTotal) }} RSD</strong></span>
            <span v-if="selectedCreditRefs.length > 0">— prihodi: <strong>{{ formatAmount(selectedIncomeTotal) }} RSD</strong></span>
          </div>
          <Button
            :label="importing ? 'Uvozim…' : `Uvezi (${selectedRefs.length + selectedCreditRefs.length})`"
            icon="pi pi-download"
            :disabled="(selectedRefs.length === 0 && selectedCreditRefs.length === 0) || importing"
            :loading="importing"
            @click="importSelected"
          />
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { statementApi } from '@/api/statements';
import { useAppToast } from '@/composables/useAppToast';
import { useUserStore } from '@/stores/user';
import { useBalanceStore } from '@/stores/balance';
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from '@/constants/categories';
import { incomeTypeLabels, type IncomeType } from '@/types/income';
import { USERS } from '@/constants/app';
import { LOCALE } from '@/constants/app';
import type { ParseStatementResult, StatementTransaction } from '@/types/statement';

const { showSuccess, showError } = useAppToast();
const userStore = useUserStore();
const balanceStore = useBalanceStore();

const fileInput = ref<HTMLInputElement>();
const dragging = ref(false);
const parsing = ref(false);
const importing = ref(false);
const result = ref<ParseStatementResult | null>(null);
const selectedRefs = ref<string[]>([]);
const selectedCreditRefs = ref<string[]>([]);

const categoryOptions = EXPENSE_CATEGORIES.map(value => ({ value, label: CATEGORY_LABELS[value] }));
const incomeTypeOptions = (Object.keys(incomeTypeLabels) as IncomeType[]).map(value => ({ value, label: incomeTypeLabels[value] }));

const debits = computed(() => result.value?.transactions.filter(tx => tx.direction === 'debit') ?? []);
const credits = computed(() => result.value?.transactions.filter(tx => tx.direction === 'credit') ?? []);

const counts = computed(() => ({
  new: debits.value.filter(tx => tx.matchStatus === 'new').length,
  duplicate: debits.value.filter(tx => tx.matchStatus === 'duplicate').length,
  alreadyImported: debits.value.filter(tx => tx.matchStatus === 'already_imported').length
}));

const selectableRefs = computed(() =>
  debits.value.filter(tx => tx.matchStatus !== 'already_imported').map(tx => tx.ref)
);
const allSelected = computed(
  () => selectableRefs.value.length > 0 && selectedRefs.value.length === selectableRefs.value.length
);
const selectableCreditRefs = computed(() =>
  credits.value.filter(tx => tx.matchStatus !== 'already_imported').map(tx => tx.ref)
);
const allCreditsSelected = computed(
  () => selectableCreditRefs.value.length > 0 && selectedCreditRefs.value.length === selectableCreditRefs.value.length
);
const allImported = computed(
  () =>
    debits.value.length + credits.value.length > 0 &&
    debits.value.every(tx => tx.matchStatus === 'already_imported') &&
    credits.value.every(tx => tx.matchStatus === 'already_imported' || tx.matchStatus === 'skipped')
);
const selectedExpenseTotal = computed(() =>
  debits.value.filter(tx => selectedRefs.value.includes(tx.ref)).reduce((sum, tx) => sum + tx.amount, 0)
);
const selectedIncomeTotal = computed(() =>
  credits.value.filter(tx => selectedCreditRefs.value.includes(tx.ref)).reduce((sum, tx) => sum + tx.amount, 0)
);

/** The user store keeps lowercase ids; expenses store proper names */
const createdBy = computed(() => {
  const current = userStore.selectedUser;
  return USERS.find(user => user.value.toLowerCase() === current)?.value ?? 'Dejan';
});

function onZoneClick() {
  if (parsing.value || !fileInput.value) return;
  // Clear the value first so choosing the same file still fires @change
  fileInput.value.value = '';
  fileInput.value.click();
}

function onDrop(event: DragEvent) {
  dragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) parseFile(file);
}

function onFileChosen(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) parseFile(file);
}

async function parseFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showError('Podržani su samo PDF izvodi');
    return;
  }
  parsing.value = true;
  try {
    const parsed = await statementApi.parse(file);
    if (!parsed.success) {
      showError(parsed.error || 'Izvod nije moguće obraditi');
      return;
    }
    result.value = parsed;
    // Pre-select what the backend suggests: new, real expenses (no ATM withdrawals/transfers/duplicates)
    selectedRefs.value = parsed.transactions
      .filter(tx => tx.direction === 'debit' && tx.suggestImport)
      .map(tx => tx.ref);
    // Pre-select credits the backend thinks are real income (not internal transfers/cash movements)
    selectedCreditRefs.value = parsed.transactions
      .filter(tx => tx.direction === 'credit' && tx.suggestImport)
      .map(tx => tx.ref);
  } catch (error) {
    showError('Izvod nije moguće obraditi', error);
  } finally {
    parsing.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

function toggleAll(checked: boolean) {
  selectedRefs.value = checked ? [...selectableRefs.value] : [];
}

function toggleAllCredits(checked: boolean) {
  selectedCreditRefs.value = checked ? [...selectableCreditRefs.value] : [];
}

async function importSelected() {
  if (!result.value) return;
  const chosenExpenses = debits.value.filter(tx => selectedRefs.value.includes(tx.ref));
  const chosenIncomes = credits.value.filter(tx => selectedCreditRefs.value.includes(tx.ref));
  importing.value = true;
  try {
    const { expensesImported, incomesImported, skipped } = await statementApi.import({
      createdBy: createdBy.value,
      transactions: [
        ...chosenExpenses.map(tx => ({
          ref: tx.ref,
          date: tx.date,
          merchant: tx.merchant,
          rawDescription: tx.rawDescription,
          category: tx.category,
          amount: tx.amount,
          direction: 'debit' as const
        })),
        ...chosenIncomes.map(tx => ({
          ref: tx.ref,
          date: tx.date,
          merchant: tx.merchant,
          rawDescription: tx.rawDescription,
          incomeType: tx.incomeType,
          amount: tx.amount,
          direction: 'credit' as const
        }))
      ]
    });
    balanceStore.invalidateCache();
    const parts = [];
    if (expensesImported > 0) parts.push(`${expensesImported} troškova`);
    if (incomesImported > 0) parts.push(`${incomesImported} prihoda`);
    showSuccess(`Uvezeno: ${parts.join(', ') || '0'}${skipped > 0 ? `, preskočeno ${skipped}` : ''}`);
    markImported([...chosenExpenses, ...chosenIncomes].map(tx => tx.ref));
  } catch (error) {
    showError('Uvoz nije uspeo', error);
  } finally {
    importing.value = false;
  }
}

function markImported(refs: string[]) {
  if (!result.value) return;
  result.value.transactions = result.value.transactions.map(tx =>
    refs.includes(tx.ref)
      ? ({ ...tx, matchStatus: 'already_imported', matchReason: 'Upravo uvezeno', suggestImport: false } as StatementTransaction)
      : tx
  );
  selectedRefs.value = [];
  selectedCreditRefs.value = [];
}

function reset() {
  result.value = null;
  selectedRefs.value = [];
  selectedCreditRefs.value = [];
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatAmount(value: number): string {
  return value.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<style scoped>
.statement-import {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.page-title {
  margin: 0 0 0.25rem;
}

.page-subtitle {
  margin: 0 0 1.5rem;
  color: var(--text-secondary);
}

.section-title {
  margin: 2rem 0 0.25rem;
}

.upload-zone {
  border: 2px dashed var(--border-color);
  border-radius: 16px;
  padding: 4rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
  background: var(--surface-card);
}

.upload-zone:hover,
.upload-zone.dragging {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.upload-zone.parsing {
  cursor: progress;
}

.upload-icon {
  font-size: 3rem;
  color: var(--primary-color);
}

.upload-text {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1rem 0 0.25rem;
}

.upload-hint {
  color: var(--text-secondary);
  margin: 0;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.review-period {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.review-counts {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.count-chip {
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.count-chip.new {
  background: var(--income-light);
  color: var(--income-color);
}

.count-chip.duplicate {
  background: var(--expense-light);
  color: var(--expense-color);
}

.count-chip.imported {
  background: var(--surface-hover);
  color: var(--text-secondary);
}

.merchant-cell {
  display: flex;
  flex-direction: column;
}

.merchant-name {
  font-weight: 600;
}

.merchant-raw {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.category-select {
  width: 100%;
  max-width: 11rem;
}

.amount {
  font-weight: 600;
  white-space: nowrap;
}

.import-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 12px;
  background: var(--surface-card);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
}

@media (max-width: 640px) {
  .upload-zone {
    padding: 2.5rem 1rem;
  }

  .import-footer {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
}
</style>
