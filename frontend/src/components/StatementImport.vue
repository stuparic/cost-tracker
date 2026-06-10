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
      @click="!parsing && fileInput?.click()"
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
        <Button label="Drugi fajl" icon="pi pi-refresh" text @click="reset" />
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

      <div v-if="credits.length > 0" class="credits-note">
        <i class="pi pi-info-circle"></i>
        {{ credits.length }} uplata (prilivi) je pronađeno u izvodu — uplate se ne uvoze kao troškovi.
      </div>

      <div class="import-footer">
        <div class="import-summary">
          Izabrano: <strong>{{ selectedRefs.length }}</strong> transakcija, ukupno
          <strong>{{ formatAmount(selectedTotal) }} RSD</strong>
        </div>
        <Button
          :label="importing ? 'Uvozim…' : `Uvezi (${selectedRefs.length})`"
          icon="pi pi-download"
          :disabled="selectedRefs.length === 0 || importing"
          :loading="importing"
          @click="importSelected"
        />
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

const categoryOptions = EXPENSE_CATEGORIES.map(value => ({ value, label: CATEGORY_LABELS[value] }));

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
const selectedTotal = computed(() =>
  debits.value.filter(tx => selectedRefs.value.includes(tx.ref)).reduce((sum, tx) => sum + tx.amount, 0)
);

/** The user store keeps lowercase ids; expenses store proper names */
const createdBy = computed(() => {
  const current = userStore.selectedUser;
  return USERS.find(user => user.value.toLowerCase() === current)?.value ?? 'Dejan';
});

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

async function importSelected() {
  if (!result.value) return;
  const chosen = debits.value.filter(tx => selectedRefs.value.includes(tx.ref));
  importing.value = true;
  try {
    const { imported, skipped } = await statementApi.import({
      createdBy: createdBy.value,
      transactions: chosen.map(tx => ({
        ref: tx.ref,
        date: tx.date,
        merchant: tx.merchant,
        rawDescription: tx.rawDescription,
        category: tx.category,
        amount: tx.amount
      }))
    });
    balanceStore.invalidateCache();
    showSuccess(`Uvezeno ${imported} troškova${skipped > 0 ? `, preskočeno ${skipped}` : ''}`);
    markImported(chosen.map(tx => tx.ref));
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
}

function reset() {
  result.value = null;
  selectedRefs.value = [];
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
  color: var(--text-secondary, #6b7280);
}

.upload-zone {
  border: 2px dashed var(--border-color, #d1d5db);
  border-radius: 16px;
  padding: 4rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
  background: var(--card-bg, #ffffff);
}

.upload-zone:hover,
.upload-zone.dragging {
  border-color: var(--accent-color, #10b981);
  background: var(--accent-bg, #ecfdf5);
}

.upload-zone.parsing {
  cursor: progress;
}

.upload-icon {
  font-size: 3rem;
  color: var(--accent-color, #10b981);
}

.upload-text {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1rem 0 0.25rem;
}

.upload-hint {
  color: var(--text-secondary, #6b7280);
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
  background: #ecfdf5;
  color: #047857;
}

.count-chip.duplicate {
  background: #fffbeb;
  color: #b45309;
}

.count-chip.imported {
  background: #f3f4f6;
  color: #4b5563;
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
  color: var(--text-secondary, #9ca3af);
}

.category-select {
  width: 100%;
  max-width: 11rem;
}

.amount {
  font-weight: 600;
  white-space: nowrap;
}

.credits-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  color: var(--text-secondary, #6b7280);
  font-size: 0.9rem;
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
  background: var(--card-bg, #ffffff);
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
