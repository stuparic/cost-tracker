<template>
  <ul class="tx-list">
    <li v-for="tx in transactions" :key="tx.id">
      <button class="tx-row" :disabled="tx.flow === 'internal'" :title="tx.description" @click="emit('edit', tx)">
        <span class="tx-date">{{ formatDay(tx.bookingDate) }}</span>
        <span class="tx-body">
          <span class="tx-merchant">{{ tx.merchant }}</span>
          <span class="tx-meta">
            {{ reportCategoryLabel(tx.flow === 'transfer_out' ? 'Transfer' : tx.category) }}
            <span v-if="tx.travel" class="tag">putovanje</span>
            <span v-if="tx.overridden" class="tag" title="Kategorija je ručno izabrana">ručno</span>
            <span v-if="tx.currency !== 'RSD'" class="tag">{{ formatNumber(tx.amount) }} {{ tx.currency }}</span>
          </span>
        </span>
        <span class="tx-amount" :class="amountClass(tx)">{{ sign(tx) }}{{ formatNumber(Math.abs(tx.amountRsd), false) }}</span>
        <i v-if="tx.flow !== 'internal'" class="pi pi-pencil tx-edit" aria-hidden="true"></i>
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { ReportTransaction } from '@/types/report';
import { reportCategoryLabel } from '@/constants/report-categories';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';

defineProps<{ transactions: ReportTransaction[] }>();
const emit = defineEmits<{ edit: [transaction: ReportTransaction] }>();
const { formatNumber } = useTransactionFormatting();

function formatDay(date: string): string {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}.`;
}

/** Money in shows "+", money out "−"; a refund is money in that lowers spending */
function sign(tx: ReportTransaction): string {
  return tx.direction === 'credit' ? '+' : '−';
}

function amountClass(tx: ReportTransaction): string {
  if (tx.flow === 'internal' || tx.flow === 'transfer_in' || tx.flow === 'transfer_out') return 'neutral';
  return tx.direction === 'credit' ? 'in' : 'out';
}
</script>

<style scoped>
.tx-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tx-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.625rem 0.25rem;
  border: none;
  border-bottom: 1px solid var(--border-color);
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.tx-row:disabled {
  cursor: default;
  opacity: 0.7;
}

.tx-row:not(:disabled):hover {
  background: var(--surface-hover);
}

.tx-date {
  width: 3rem;
  flex-shrink: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.tx-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.tx-merchant {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tx-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.tag {
  padding: 0 0.375rem;
  border-radius: 999px;
  background: var(--surface-hover);
}

.tx-amount {
  font-weight: 700;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tx-amount.out {
  color: var(--text-primary);
}

.tx-amount.in {
  color: var(--income-color);
}

.tx-amount.neutral {
  color: var(--text-secondary);
}

.tx-edit {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
</style>
