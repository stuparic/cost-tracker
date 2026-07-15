<template>
  <Dialog
    :visible="visible"
    :header="expense.shopName || 'Detalji troška'"
    :modal="true"
    class="detail-dialog"
    :dismissable-mask="true"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="detail-body">
      <div class="detail-amount-row">
        <span class="detail-amount">{{ formatNumber(expense.rsdAmount, false) }} RSD</span>
        <span class="detail-amount-eur">{{ formatNumber(expense.eurAmount, true) }} EUR</span>
      </div>
      <p class="detail-rate">Kurs: 1 EUR = {{ formatNumber(expense.exchangeRate, true) }} RSD</p>

      <dl class="detail-grid">
        <dt>Kategorija</dt>
        <dd>
          <span class="cat-pill"><i :class="['pi', categoryIcon]"></i> {{ categoryLabel }}</span>
        </dd>

        <dt>Datum</dt>
        <dd>{{ formatDate(expense.purchaseDate) }}</dd>

        <dt>Prodavnica</dt>
        <dd>{{ expense.shopName }}</dd>

        <dt v-if="expense.productDescription">Opis</dt>
        <dd v-if="expense.productDescription">{{ expense.productDescription }}</dd>

        <dt>Način plaćanja</dt>
        <dd>{{ expense.paymentMethod || '—' }}</dd>

        <dt v-if="expense.tags && expense.tags.length">Tagovi</dt>
        <dd v-if="expense.tags && expense.tags.length" class="detail-tags">
          <span v-for="tag in expense.tags" :key="tag" class="detail-tag">{{ tag }}</span>
        </dd>

        <dt>Uneo</dt>
        <dd>{{ expense.createdBy || 'Nepoznato' }}</dd>

        <dt>Način unosa</dt>
        <dd>{{ sourceLabel }}</dd>

        <dt v-if="expense.voiceTranscript">Glasovni unos</dt>
        <dd v-if="expense.voiceTranscript" class="detail-transcript">"{{ expense.voiceTranscript }}"</dd>

        <dt v-if="expense.bankRef">Bankovna referenca</dt>
        <dd v-if="expense.bankRef"><code>{{ expense.bankRef }}</code></dd>

        <dt v-if="expense.private">Privatnost</dt>
        <dd v-if="expense.private">Privatan trošak</dd>
      </dl>
    </div>

    <template #footer>
      <Button label="Obriši" icon="pi pi-trash" severity="danger" text @click="$emit('delete', expense)" />
      <Button label="Izmeni" icon="pi pi-pencil" @click="$emit('edit', expense)" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import type { Expense } from '@/types/expense';
import { CATEGORY_LABELS, type ExpenseCategory } from '@/constants/categories';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';

const props = defineProps<{ visible: boolean; expense: Expense }>();
defineEmits<{ 'update:visible': [value: boolean]; edit: [expense: Expense]; delete: [expense: Expense] }>();

const { formatNumber, formatRelativeDate: formatDate } = useTransactionFormatting();

const CATEGORY_ICONS: Record<string, string> = {
  Groceries: 'pi-shopping-cart',
  Home: 'pi-home',
  Transport: 'pi-car',
  Dining: 'pi-shopping-bag',
  Health: 'pi-heart',
  Utilities: 'pi-bolt',
  Loan: 'pi-credit-card',
  Travel: 'pi-globe',
  Work: 'pi-briefcase',
  Transfers: 'pi-sync',
  Charity: 'pi-heart-fill',
  Other: 'pi-ellipsis-h'
};

const categoryLabel = computed(() => CATEGORY_LABELS[props.expense.category as ExpenseCategory] ?? props.expense.category);
const categoryIcon = computed(() => CATEGORY_ICONS[props.expense.category] ?? 'pi-tag');

const sourceLabel = computed(() => {
  switch (props.expense.creationMethod) {
    case 'voice':
      return 'Glasovno';
    case 'auto':
      return 'Automatski (ponavljajuće)';
    case 'statement':
      return 'Iz izvoda';
    default:
      return 'Ručno';
  }
});
</script>

<style scoped>
.detail-body {
  min-width: min(90vw, 26rem);
}
.detail-amount-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}
.detail-amount {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
}
.detail-amount-eur {
  color: var(--text-secondary);
  font-weight: 600;
}
.detail-rate {
  margin: 0.15rem 0 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.detail-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  margin: 0;
}
.detail-grid dt {
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
}
.detail-grid dd {
  margin: 0;
  color: var(--text-primary);
  word-break: break-word;
}
.cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.detail-tag {
  background: var(--surface-hover);
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
  font-size: 0.8rem;
}
.detail-transcript {
  font-style: italic;
  color: var(--text-secondary);
}
</style>
