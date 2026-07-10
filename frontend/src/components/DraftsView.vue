<template>
  <div class="drafts-view">
    <div class="drafts-header">
      <div>
        <h2 class="page-title">Na čekanju</h2>
        <p class="page-subtitle">Troškovi sa notifikacija koje vidiš samo ti — potvrdi one koje želiš da uđu u evidenciju.</p>
      </div>
      <Button
        v-if="drafts.length > 1"
        :label="`Potvrdi sve (${drafts.length})`"
        icon="pi pi-check-circle"
        :loading="confirmingAll"
        @click="confirmAll"
      />
    </div>

    <div v-if="loading" class="empty-note"><i class="pi pi-spinner pi-spin"></i> Učitavanje…</div>

    <div v-else-if="drafts.length === 0" class="empty-note">
      <i class="pi pi-check" style="font-size: 1.5rem"></i>
      <p>Nema troškova na čekanju. Nove kupovine sa notifikacija će se pojaviti ovde.</p>
    </div>

    <ul v-else class="draft-list">
      <li v-for="draft in drafts" :key="draft.id" class="draft-card">
        <span class="draft-icon" :style="iconStyle(draft.category || 'Other')">
          <i :class="categoryIcon(draft.category || 'Other')"></i>
        </span>
        <span class="draft-body">
          <span class="draft-title">{{ draft.shopName }}</span>
          <span class="draft-meta">{{ formatRelativeDate(draft.purchaseDate) }} · {{ categoryLabel(draft.category) }}</span>
        </span>
        <span class="draft-amount">{{ formatNumber(draft.amount, false) }} {{ draft.currency }}</span>
        <span class="draft-actions">
          <Button
            v-tooltip.top="'Potvrdi'"
            icon="pi pi-check"
            rounded
            size="small"
            :loading="busyId === draft.id"
            @click="confirmOne(draft)"
          />
          <Button
            v-tooltip.top="'Odbaci (ne beleži se)'"
            icon="pi pi-times"
            rounded
            text
            severity="danger"
            size="small"
            :disabled="busyId === draft.id"
            @click="discardOne(draft)"
          />
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import { draftsApi, type ExpenseDraft } from '@/api/drafts';
import { useAppToast } from '@/composables/useAppToast';
import { useBalanceStore } from '@/stores/balance';
import { CATEGORY_LABELS, type ExpenseCategory } from '@/constants/categories';
import { categoryColor, categoryIcon } from '@/constants/category-style';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';

const { showSuccess, showError } = useAppToast();
const { formatNumber, formatRelativeDate } = useTransactionFormatting();
const balanceStore = useBalanceStore();

const drafts = ref<ExpenseDraft[]>([]);
const loading = ref(true);
const busyId = ref<string | null>(null);
const confirmingAll = ref(false);

function categoryLabel(category?: string): string {
  return CATEGORY_LABELS[category as ExpenseCategory] ?? category ?? 'Ostalo';
}

function iconStyle(category: string) {
  const color = categoryColor(category);
  return { color, background: `${color}21` };
}

async function refresh() {
  loading.value = true;
  try {
    drafts.value = await draftsApi.listMine();
  } catch (error) {
    showError('Ne mogu da učitam troškove na čekanju', error);
  } finally {
    loading.value = false;
  }
}

async function confirmOne(draft: ExpenseDraft) {
  busyId.value = draft.id;
  try {
    await draftsApi.confirm(draft.id);
    drafts.value = drafts.value.filter(d => d.id !== draft.id);
    balanceStore.invalidateCache();
    showSuccess(`Potvrđeno: ${draft.shopName}`);
  } catch (error) {
    showError('Potvrda nije uspela', error);
  } finally {
    busyId.value = null;
  }
}

async function discardOne(draft: ExpenseDraft) {
  busyId.value = draft.id;
  try {
    await draftsApi.discard(draft.id);
    drafts.value = drafts.value.filter(d => d.id !== draft.id);
  } catch (error) {
    showError('Odbacivanje nije uspelo', error);
  } finally {
    busyId.value = null;
  }
}

async function confirmAll() {
  confirmingAll.value = true;
  try {
    const { confirmed } = await draftsApi.confirmAll();
    drafts.value = [];
    balanceStore.invalidateCache();
    showSuccess(`Potvrđeno ${confirmed} troškova`);
  } catch (error) {
    showError('Potvrda nije uspela', error);
  } finally {
    confirmingAll.value = false;
  }
}

onMounted(refresh);
</script>

<style scoped>
.drafts-view {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 0.5rem 1.25rem 2rem;
}

.drafts-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.page-title {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.25rem;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.empty-note {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  font-size: 0.9375rem;
  text-align: center;
}

.draft-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.draft-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.75rem 0.875rem;
}

.draft-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.draft-icon i {
  font-size: 1rem;
}

.draft-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.draft-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.draft-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.draft-amount {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--expense-color);
  white-space: nowrap;
}

.draft-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

@media (max-width: 640px) {
  .drafts-header {
    flex-direction: column;
  }
}
</style>
