<template>
  <div class="income-form">
    <h2 class="form-title">{{ greeting }}</h2>

    <form @submit.prevent="handleSubmit">
      <!-- Amount Input - Big and Beautiful -->
      <div class="form-field amount-field">
        <label for="amount" class="field-label">Iznos *</label>
        <InputNumber
          id="amount"
          v-model="form.amount"
          mode="decimal"
          :min-fraction-digits="2"
          :max-fraction-digits="2"
          :min="0.01"
          placeholder="0.00"
          class="amount-input-large"
          :class="{ 'p-invalid': errors.amount }"
          @input="errors.amount = ''"
        />
        <small v-if="errors.amount" class="error-message">{{ errors.amount }}</small>
      </div>

      <!-- Currency Pills -->
      <div class="form-field">
        <label class="field-label">Valuta</label>
        <div class="currency-pills">
          <button
            v-for="curr in currencies"
            :key="curr.value"
            type="button"
            class="currency-pill"
            :class="{ active: form.currency === curr.value }"
            @click="form.currency = curr.value as Currency"
          >
            {{ curr.label }}
          </button>
        </div>
      </div>

      <!-- Source Input -->
      <div class="form-field">
        <label for="source" class="field-label">Izvor *</label>
        <InputText
          id="source"
          v-model="form.source"
          placeholder="Npr. Symphony, Dom zdravlja..."
          class="w-full"
          :class="{ 'p-invalid': errors.source }"
          @input="errors.source = ''"
        />
        <small v-if="errors.source" class="error-message">{{ errors.source }}</small>
      </div>

      <!-- Income Type Pills -->
      <div class="form-field">
        <label class="field-label">Tip prihoda *</label>
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
        <label for="description" class="field-label">Opis</label>
        <Textarea id="description" v-model="form.description" rows="2" placeholder="Dodatne napomene..." class="w-full" />
      </div>

      <!-- Date Received (only show if NOT recurring) -->
      <div v-if="!form.isRecurring" class="form-field">
        <label for="dateReceived" class="field-label">Datum primanja</label>
        <DatePicker
          id="dateReceived"
          v-model="dateReceived"
          show-time
          hour-format="24"
          date-format="dd.mm.yy"
          placeholder="Odaberi datum..."
          class="w-full"
        />
      </div>

      <!-- Recurring Checkbox -->
      <div class="form-field">
        <div class="recurring-checkbox">
          <Checkbox v-model="form.isRecurring" input-id="recurring" binary />
          <label for="recurring" class="checkbox-label">Ponavljajući prihod</label>
        </div>
      </div>

      <!-- Recurring Frequency (show only if isRecurring is true) -->
      <div v-if="form.isRecurring" class="form-field">
        <label class="field-label">Učestalost *</label>
        <div class="frequency-pills">
          <button
            v-for="(label, freq) in recurringFrequencyLabels"
            :key="freq"
            type="button"
            class="frequency-pill"
            :class="{ active: form.recurringFrequency === freq }"
            @click="form.recurringFrequency = freq as RecurringFrequency"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <!-- Start Date (show only if isRecurring is true) -->
      <div v-if="form.isRecurring" class="form-field">
        <label for="startDate" class="field-label">Datum prvog prihoda *</label>
        <DatePicker id="startDate" v-model="form.startDate" date-format="dd.mm.yy" placeholder="Odaberi datum..." class="w-full" />
      </div>

      <!-- Recurring Until (optional) -->
      <div v-if="form.isRecurring" class="form-field">
        <label for="recurringUntil" class="field-label">Ponavljaj do (opciono)</label>
        <DatePicker
          id="recurringUntil"
          v-model="form.recurringUntil"
          date-format="dd.mm.yy"
          placeholder="Ako nije odabrano, ponavlja se beskonačno..."
          class="w-full"
        />
      </div>

      <!-- Submit Button -->
      <Button label="Sačuvaj" type="submit" :loading="loading" :disabled="!isFormValid" class="submit-btn" size="large" />
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';
import { useIncomesStore } from '@/stores/incomes';
import { useUserStore } from '@/stores/user';
import type { CreateIncomeDto, Currency, IncomeType } from '@/types/income';
import { incomeTypeLabels } from '@/types/income';
import { recurringFrequencyLabels, type RecurringFrequency, type CreateRecurringOccurrenceDto } from '@/types/recurring-occurrence';
import apiClient from '@/api/client';

const toast = useToast();
const incomesStore = useIncomesStore();
const userStore = useUserStore();

// Personalized greeting based on selected user
const greeting = computed(() => {
  if (userStore.selectedUser === 'svetla') {
    return 'Šta si zaradila danas, Svetla?';
  } else if (userStore.selectedUser === 'dejan') {
    return 'Šta si zaradio danas, Dejane?';
  }
  return 'Brzi unos prihoda';
});

// Smart defaults based on user
const getDefaultSource = () => {
  if (userStore.selectedUser === 'svetla') {
    return 'Dom zdravlja Titel';
  } else if (userStore.selectedUser === 'dejan') {
    return 'Symphony';
  }
  return '';
};

// Form state with smart defaults
const form = reactive({
  amount: null as number | null,
  currency: 'RSD' as Currency,
  source: getDefaultSource(),
  incomeType: 'Salary' as IncomeType,
  description: '',
  isRecurring: false,
  recurringFrequency: 'monthly' as RecurringFrequency,
  startDate: new Date(),
  recurringUntil: null as Date | null
});

const dateReceived = ref<Date>(new Date());
const loading = ref(false);

// Errors
const errors = reactive({
  amount: '',
  source: ''
});

// Currency options
const currencies = [
  { label: 'RSD', value: 'RSD' },
  { label: 'EUR', value: 'EUR' }
];

// Validation
const isFormValid = computed(() => {
  return form.amount && form.amount > 0 && form.source.trim().length > 0;
});

// Form submission
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
    if (form.isRecurring) {
      // Create recurring occurrence
      const occurrenceData: CreateRecurringOccurrenceDto = {
        occurrenceType: 'income',
        amount: form.amount,
        currency: form.currency,
        source: form.source.trim(),
        incomeType: form.incomeType,
        description: form.description?.trim() || '',
        frequency: form.recurringFrequency,
        startDate: form.startDate.toISOString(),
        recurringUntil: form.recurringUntil?.toISOString(),
        createdBy: userStore.selectedUser === 'svetla' ? 'Svetla' : 'Dejan'
      };

      await apiClient.post('/recurring-occurrences', occurrenceData);

      toast.add({
        severity: 'success',
        summary: 'Uspešno!',
        detail: 'Ponavljajući prihod je kreiran',
        life: 3000
      });
    } else {
      // Create regular one-time income
      const incomeData: CreateIncomeDto = {
        amount: form.amount,
        currency: form.currency,
        source: form.source.trim(),
        incomeType: form.incomeType,
        dateReceived: dateReceived.value.toISOString(),
        createdBy: userStore.selectedUser === 'svetla' ? 'Svetla' : 'Dejan'
      };

      // Add description if provided
      if (form.description?.trim()) {
        incomeData.description = form.description.trim();
      }

      await incomesStore.createIncome(incomeData);

      toast.add({
        severity: 'success',
        summary: 'Uspešno!',
        detail: 'Prihod je sačuvan',
        life: 3000
      });
    }

    // Reset form
    resetForm();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Greška',
      detail: error.response?.data?.message || 'Nije moguće sačuvati prihod',
      life: 5000
    });
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.amount = null;
  form.currency = 'RSD';
  form.source = getDefaultSource();
  form.incomeType = 'Salary';
  form.description = '';
  form.isRecurring = false;
  form.recurringFrequency = 'monthly';
  form.startDate = new Date();
  form.recurringUntil = null;
  dateReceived.value = new Date();
}

// Initialize defaults when component mounts or user changes
onMounted(() => {
  // Check for voice data from route state (AI-parsed transcript)
  const voiceData = history.state?.voiceData;
  if (voiceData) {
    // Pre-fill form with AI-parsed data
    if (voiceData.amount) form.amount = voiceData.amount;
    if (voiceData.currency) form.currency = voiceData.currency;
    if (voiceData.shopOrSource) form.source = voiceData.shopOrSource;
    if (voiceData.description) form.description = voiceData.description;
    if (voiceData.incomeType) form.incomeType = voiceData.incomeType as IncomeType;

    // Set date if provided
    if (voiceData.date) {
      dateReceived.value = new Date(voiceData.date);
    }

    // Show warning if confidence is not high
    const confidence = history.state?.confidence;
    if (confidence === 'low' || confidence === 'medium') {
      toast.add({
        severity: 'warn',
        summary: 'Proverite podatke',
        detail: 'Molimo pregledajte automatski popunjene podatke pre čuvanja',
        life: 5000
      });
    }
  } else {
    // Use smart defaults if no voice data
    form.source = getDefaultSource();
  }
});
</script>

<style scoped>
.income-form {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem;
  background: white;
  min-height: 100%;
}

.form-title {
  margin: 0 0 1.75rem 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
}

.form-field {
  margin-bottom: 1.5rem;
}

.field-label {
  display: block;
  margin-bottom: 0.625rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.9375rem;
}

/* Big Amount Input */
.amount-field {
  margin-bottom: 2rem;
}

.amount-input-large {
  width: 100%;
}

.amount-input-large :deep(input) {
  font-size: 2.5rem !important;
  font-weight: 700 !important;
  text-align: center !important;
  padding: 1.25rem 0.5rem !important;
  border: 2px solid #e5e7eb !important;
  border-radius: 1rem !important;
  transition: all 0.2s !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.amount-input-large :deep(input::placeholder) {
  text-align: center !important;
  opacity: 0.5 !important;
}

.amount-input-large :deep(input):focus {
  border-color: var(--income-color) !important;
  box-shadow: 0 0 0 3px var(--income-shadow) !important;
}

.amount-input-large.p-invalid :deep(input) {
  border-color: #dc2626 !important;
}

/* Currency Pills */
.currency-pills {
  display: flex;
  gap: 0.75rem;
}

.currency-pill {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 0.75rem;
  font-size: 1.125rem;
  font-weight: 700;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.currency-pill:hover {
  border-color: var(--income-color);
  background: var(--income-light);
}

.currency-pill.active {
  background: linear-gradient(135deg, var(--income-color) 0%, var(--income-dark) 100%);
  border-color: var(--income-color);
  color: white;
  box-shadow: 0 4px 12px var(--income-shadow);
}

/* Income Type Pills */
.income-type-pills {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.income-type-pill {
  padding: 0.875rem 1rem;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 0.75rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.income-type-pill:hover {
  border-color: var(--income-color);
  background: var(--income-light);
}

.income-type-pill.active {
  background: linear-gradient(135deg, var(--income-color) 0%, var(--income-dark) 100%);
  border-color: var(--income-color);
  color: white;
  box-shadow: 0 4px 12px var(--income-shadow);
}

.submit-btn {
  width: 100%;
  padding: 1rem;
  font-size: 1.125rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--income-color) 0%, var(--income-dark) 100%);
  border: none;
  box-shadow: 0 4px 12px var(--income-shadow);
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px var(--income-shadow);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #dc2626;
  display: block;
  margin-top: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.p-invalid {
  border-color: #dc2626 !important;
}

.w-full {
  width: 100%;
}

/* Recurring Checkbox */
.recurring-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  border: 2px solid #e5e7eb;
  transition: all 0.2s;
}

.recurring-checkbox:has(input:checked) {
  background: var(--income-light);
  border-color: var(--income-color);
}

.checkbox-label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9375rem;
  cursor: pointer;
  margin: 0;
}

/* Frequency Pills */
.frequency-pills {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.frequency-pill {
  padding: 0.875rem 1rem;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.frequency-pill:hover {
  border-color: var(--income-color);
  background: var(--income-light);
}

.frequency-pill.active {
  background: linear-gradient(135deg, var(--income-color) 0%, var(--income-dark) 100%);
  border-color: var(--income-color);
  color: white;
  box-shadow: 0 4px 12px var(--income-shadow);
}

/* Mobile-first: Full-screen experience */
@media (max-width: 768px) {
  .income-form {
    padding: 1.25rem 1rem;
    border-radius: 0;
    box-shadow: none;
  }

  .form-title {
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .form-field {
    margin-bottom: 1.375rem;
  }

  .field-label {
    font-size: 0.9375rem;
    margin-bottom: 0.5rem;
  }

  .amount-field {
    margin-bottom: 1.75rem;
  }

  .amount-input-large :deep(input) {
    font-size: 2rem !important;
    padding: 1rem !important;
  }

  .currency-pill {
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }

  .income-type-pill {
    padding: 0.75rem 0.875rem;
    font-size: 0.875rem;
  }

  .submit-btn {
    padding: 1.125rem;
    font-size: 1.0625rem;
    position: sticky;
    bottom: 0;
    background: linear-gradient(135deg, var(--income-color) 0%, var(--income-dark) 100%);
    border-radius: 0;
    margin: 0 -1rem -1.25rem -1rem;
    width: calc(100% + 2rem);
  }
}

/* Tablet and desktop: Card layout */
@media (min-width: 769px) {
  .income-form {
    border-radius: 1rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    margin-top: 0;
  }

  .submit-btn {
    border-radius: 0.75rem;
  }
}
</style>
