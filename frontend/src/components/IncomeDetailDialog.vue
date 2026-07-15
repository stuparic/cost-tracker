<template>
  <Dialog
    :visible="visible"
    :header="income.source || 'Detalji prihoda'"
    :modal="true"
    class="detail-dialog"
    :dismissable-mask="true"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="detail-body">
      <div class="detail-amount-row">
        <span class="detail-amount income">{{ formatNumber(income.rsdAmount, false) }} RSD</span>
        <span class="detail-amount-eur">{{ formatNumber(income.eurAmount, true) }} EUR</span>
      </div>
      <p class="detail-rate">Kurs: 1 EUR = {{ formatNumber(income.exchangeRate, true) }} RSD</p>

      <dl class="detail-grid">
        <dt>Tip prihoda</dt>
        <dd>{{ incomeTypeLabel }}</dd>

        <dt>Datum</dt>
        <dd>{{ formatDate(income.dateReceived) }}</dd>

        <dt>Izvor</dt>
        <dd>{{ income.source }}</dd>

        <dt v-if="income.description">Opis</dt>
        <dd v-if="income.description">{{ income.description }}</dd>

        <dt>Uneo</dt>
        <dd>{{ income.createdBy || 'Nepoznato' }}</dd>

        <dt>Način unosa</dt>
        <dd>{{ sourceLabel }}</dd>

        <dt v-if="income.voiceTranscript">Glasovni unos</dt>
        <dd v-if="income.voiceTranscript" class="detail-transcript">"{{ income.voiceTranscript }}"</dd>
      </dl>
    </div>

    <template #footer>
      <Button label="Obriši" icon="pi pi-trash" severity="danger" text @click="$emit('delete', income)" />
      <Button label="Izmeni" icon="pi pi-pencil" @click="$emit('edit', income)" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { type Income, incomeTypeLabels } from '@/types/income';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';

const props = defineProps<{ visible: boolean; income: Income }>();
defineEmits<{ 'update:visible': [value: boolean]; edit: [income: Income]; delete: [income: Income] }>();

const { formatNumber, formatRelativeDate: formatDate } = useTransactionFormatting();

const incomeTypeLabel = computed(() => incomeTypeLabels[props.income.incomeType] ?? props.income.incomeType);

const sourceLabel = computed(() => {
  switch (props.income.creationMethod) {
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
.detail-amount.income {
  color: var(--income-color, var(--text-primary));
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
.detail-transcript {
  font-style: italic;
  color: var(--text-secondary);
}
</style>
