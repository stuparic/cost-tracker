<template>
  <Dialog
    :visible="transaction !== null"
    modal
    header="Promeni kategoriju"
    :style="{ width: '28rem' }"
    :dismissable-mask="true"
    @update:visible="value => !value && emit('close')"
  >
    <template v-if="transaction">
      <div class="tx-summary">
        <p class="tx-merchant">{{ transaction.merchant }}</p>
        <p class="tx-desc">{{ transaction.description }}</p>
        <p class="tx-amount">
          {{ transaction.direction === 'credit' ? '+' : '−' }}{{ formatNumber(Math.abs(transaction.amountRsd), false) }} din ·
          {{ transaction.bookingDate.split('-').reverse().join('.') }}
        </p>
      </div>

      <label class="field-label" for="report-category">Kategorija</label>
      <Select
        v-model="category"
        input-id="report-category"
        :options="options"
        option-label="label"
        option-value="value"
        option-group-label="label"
        option-group-children="items"
        class="category-select"
      >
        <template #option="{ option }">
          <span class="option"><i :class="option.icon"></i>{{ option.label }}</span>
        </template>
      </Select>

      <fieldset class="scope">
        <legend class="field-label">Primeni na</legend>
        <label v-if="!perTransaction" class="scope-option">
          <input v-model="scope" type="radio" value="merchant" />
          <span>
            Sve stavke trgovca <strong>{{ transaction.merchant }}</strong>
            <small>u svim mesecima, i budućim izvodima</small>
          </span>
        </label>
        <label class="scope-option">
          <input v-model="scope" type="radio" value="transaction" />
          <span>
            Samo ovu stavku
            <small v-if="perTransaction">opis ne kaže kome je plaćeno, pa se ovakve stavke razvrstavaju jedna po jedna</small>
          </span>
        </label>
      </fieldset>

      <div class="actions">
        <Button
          v-if="transaction.overridden"
          label="Vrati automatsku"
          text
          size="small"
          :loading="saving === 'reset'"
          @click="save(null)"
        />
        <span class="spacer"></span>
        <Button label="Otkaži" text size="small" @click="emit('close')" />
        <Button label="Sačuvaj" size="small" :disabled="!category" :loading="saving === 'save'" @click="save(category)" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Button from 'primevue/button';
import type { ReportTransaction } from '@/types/report';
import { categoryOptionGroups, TRANSFER_OPTION } from '@/constants/report-categories';
import { reportsApi } from '@/api/reports';
import { useAppToast } from '@/composables/useAppToast';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';

const props = defineProps<{ transaction: ReportTransaction | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const { formatNumber } = useTransactionFormatting();
const { showError, showSuccess } = useAppToast();

const category = ref<string | null>(null);
const scope = ref<'merchant' | 'transaction'>('merchant');
const saving = ref<'save' | 'reset' | null>(null);

/** Payment orders all share one description, so a "merchant" rule would sweep up unrelated payments */
const PAYMENT_ORDER = /po nalogu gra[dđ]ana/i;
const perTransaction = computed(() => PAYMENT_ORDER.test(props.transaction?.description ?? ''));

watch(
  () => props.transaction,
  tx => {
    if (!tx) return;
    category.value = tx.flow === 'transfer_out' || tx.flow === 'transfer_in' ? TRANSFER_OPTION.value : tx.category;
    scope.value = PAYMENT_ORDER.test(tx.description) ? 'transaction' : 'merchant';
  },
  { immediate: true }
);

const options = computed(() => categoryOptionGroups(props.transaction?.direction ?? 'debit'));

async function save(value: string | null): Promise<void> {
  const tx = props.transaction;
  if (!tx) return;
  saving.value = value === null ? 'reset' : 'save';
  try {
    await reportsApi.updateCategory({ scope: scope.value, transactionId: tx.id, merchantKey: tx.merchantKey, category: value });
    showSuccess(value === null ? 'Vraćena je automatska kategorija' : 'Kategorija je sačuvana');
    emit('saved');
  } catch (error) {
    showError('Čuvanje kategorije nije uspelo', error);
  } finally {
    saving.value = null;
  }
}
</script>

<style scoped>
.tx-summary {
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  background: var(--surface-hover);
  margin-bottom: 1rem;
}

.tx-summary p {
  margin: 0;
}

.tx-merchant {
  font-weight: 700;
  color: var(--text-primary);
}

.tx-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  word-break: break-word;
}

.tx-amount {
  margin-top: 0.25rem !important;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.field-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.375rem;
}

.category-select {
  width: 100%;
}

.option {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.scope {
  border: none;
  margin: 1rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scope-option {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  cursor: pointer;
}

.scope-option input {
  margin-top: 0.2rem;
  accent-color: var(--primary-color);
}

.scope-option small {
  display: block;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.spacer {
  flex: 1;
}
</style>
