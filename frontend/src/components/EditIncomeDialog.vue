<template>
  <Dialog
    :visible="visible"
    header="Izmeni prihod"
    :modal="true"
    class="edit-income-dialog"
    :style="{ width: '90vw', maxWidth: '600px' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <form class="edit-form" @submit.prevent="handleSubmit">
      <!-- Amount -->
      <div class="form-field">
        <label for="edit-amount" class="field-label">Iznos *</label>
        <InputNumber
          id="edit-amount"
          v-model="form.amount"
          mode="decimal"
          :min-fraction-digits="2"
          :max-fraction-digits="2"
          :min="0.01"
          class="w-full"
          :class="{ 'p-invalid': errors.amount }"
          @input="errors.amount = ''"
        />
        <small v-if="errors.amount" class="error-message">{{ errors.amount }}</small>
      </div>

      <!-- Currency -->
      <div class="form-field">
        <label class="field-label">Valuta</label>
        <CurrencyPills v-model="form.currency" />
      </div>

      <!-- Source -->
      <div class="form-field">
        <label for="edit-source" class="field-label">Izvor *</label>
        <InputText
          id="edit-source"
          v-model="form.source"
          class="w-full"
          :class="{ 'p-invalid': errors.source }"
          @input="errors.source = ''"
        />
        <small v-if="errors.source" class="error-message">{{ errors.source }}</small>
      </div>

      <!-- Income Type -->
      <div class="form-field">
        <label class="field-label">Tip prihoda</label>
        <div class="income-type-pills">
          <button
            v-for="(label, type) in incomeTypeLabels"
            :key="type"
            type="button"
            class="income-type-pill"
            :class="{ active: form.incomeType === type }"
            @click="form.incomeType = type as IncomeType"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <!-- Description -->
      <div class="form-field">
        <label for="edit-description" class="field-label">Opis</label>
        <Textarea id="edit-description" v-model="form.description" rows="2" class="w-full" />
      </div>

      <!-- Date Received -->
      <div class="form-field">
        <label for="edit-date" class="field-label">Datum primanja</label>
        <DatePicker id="edit-date" v-model="form.dateReceived" show-time hour-format="24" :date-format="DATE_FORMAT" class="w-full" />
      </div>
    </form>

    <template #footer>
      <Button label="Otkaži" severity="secondary" @click="$emit('update:visible', false)" />
      <Button label="Sačuvaj" :loading="loading" class="income-button" @click="handleSubmit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import CurrencyPills from '@/components/shared/CurrencyPills.vue';
import { incomeApi } from '@/api/incomes';
import { useAppToast } from '@/composables/useAppToast';
import { DATE_FORMAT } from '@/constants/app';
import type { Income, UpdateIncomeDto, Currency, IncomeType } from '@/types/income';
import { incomeTypeLabels } from '@/types/income';

const props = defineProps<{
  visible: boolean;
  income: Income;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}>();

const { showSuccess, showError } = useAppToast();

// Form state
const form = reactive({
  amount: 0,
  currency: 'RSD' as Currency,
  source: '',
  incomeType: 'Salary' as IncomeType,
  description: '',
  dateReceived: new Date()
});

// Errors
const errors = reactive({
  amount: '',
  source: ''
});

const loading = ref(false);

// Watch for income changes and populate form
watch(
  () => props.income,
  income => {
    if (income) {
      form.amount = income.amount;
      form.currency = income.originalCurrency;
      form.source = income.source;
      form.incomeType = income.incomeType;
      form.description = income.description;
      form.dateReceived = new Date(income.dateReceived);
    }
  },
  { immediate: true }
);

async function handleSubmit() {
  // Validate
  errors.amount = '';
  errors.source = '';

  if (!form.amount || form.amount <= 0) {
    errors.amount = 'Unesite iznos';
    return;
  }

  if (!form.source.trim()) {
    errors.source = 'Unesite izvor prihoda';
    return;
  }

  loading.value = true;

  try {
    const updateData: UpdateIncomeDto = {
      amount: form.amount,
      currency: form.currency,
      source: form.source.trim(),
      incomeType: form.incomeType,
      dateReceived: form.dateReceived.toISOString()
    };

    // Add optional fields
    if (form.description?.trim()) {
      updateData.description = form.description.trim();
    }

    await incomeApi.update(props.income.id, updateData);

    showSuccess('Prihod je izmenjen');
    emit('success');
  } catch (error: any) {
    showError('Nije moguće izmeniti prihod', error);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.income-type-pills {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.income-type-pill {
  padding: 0.5rem 0.875rem;
  border: 2px solid var(--border-color);
  border-radius: 2rem;
  background: white;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.income-type-pill:hover {
  border-color: var(--income-color);
  color: var(--income-color);
}

.income-type-pill.active {
  background: var(--income-color);
  border-color: var(--income-color);
  color: white;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
}

.w-full {
  width: 100%;
}

.income-button {
  background: var(--income-color) !important;
  border-color: var(--income-color) !important;
}

.income-button:hover {
  background: var(--income-dark) !important;
  border-color: var(--income-dark) !important;
}
</style>
