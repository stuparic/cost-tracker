<template>
  <Dialog
    :visible="visible"
    header="Izmeni trošak"
    :modal="true"
    class="edit-expense-dialog"
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

      <!-- Shop Name -->
      <div class="form-field">
        <label for="edit-shop" class="field-label">Prodavnica/Usluga *</label>
        <AutoComplete
          id="edit-shop"
          v-model="form.shopName"
          :suggestions="shopSuggestions"
          class="w-full"
          :class="{ 'p-invalid': errors.shopName }"
          @complete="searchShops"
          @input="errors.shopName = ''"
        />
        <small v-if="errors.shopName" class="error-message">{{ errors.shopName }}</small>
      </div>

      <!-- Category -->
      <div class="form-field">
        <label for="edit-category" class="field-label">Kategorija</label>
        <AutoComplete
          id="edit-category"
          v-model="form.category"
          :suggestions="categorySuggestions"
          class="w-full"
          @complete="searchCategories"
        />
      </div>

      <!-- Product Description -->
      <div class="form-field">
        <label for="edit-description" class="field-label">Opis</label>
        <Textarea id="edit-description" v-model="form.productDescription" rows="2" class="w-full" />
      </div>

      <!-- Payment Method -->
      <div class="form-field">
        <label for="edit-payment" class="field-label">Način plaćanja</label>
        <Select id="edit-payment" v-model="form.paymentMethod" :options="paymentMethods" class="w-full" />
      </div>

      <!-- Tags -->
      <div class="form-field">
        <label for="edit-tags" class="field-label">Oznake</label>
        <Chips id="edit-tags" v-model="form.tags" separator="," class="w-full" />
      </div>

      <!-- Purchase Date -->
      <div class="form-field">
        <label for="edit-date" class="field-label">Datum kupovine</label>
        <DatePicker id="edit-date" v-model="form.purchaseDate" show-time hour-format="24" :date-format="DATE_FORMAT" class="w-full" />
      </div>
    </form>

    <template #footer>
      <Button label="Otkaži" severity="secondary" @click="$emit('update:visible', false)" />
      <Button label="Sačuvaj" :loading="loading" @click="handleSubmit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import AutoComplete from 'primevue/autocomplete';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Chips from 'primevue/chips';
import DatePicker from 'primevue/datepicker';
import CurrencyPills from '@/components/shared/CurrencyPills.vue';
import { expenseApi } from '@/api/expenses';
import { autocompleteApi } from '@/api/autocomplete';
import { useAppToast } from '@/composables/useAppToast';
import { useAutocomplete } from '@/composables/useAutocomplete';
import { PAYMENT_METHODS, DATE_FORMAT } from '@/constants/app';
import type { Expense, UpdateExpenseDto, Currency } from '@/types/expense';

const props = defineProps<{
  visible: boolean;
  expense: Expense;
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
  shopName: '',
  productDescription: '',
  category: '',
  paymentMethod: '',
  tags: [] as string[],
  purchaseDate: new Date()
});

// Errors
const errors = reactive({
  amount: '',
  shopName: ''
});

const loading = ref(false);

// Options
const paymentMethods = [...PAYMENT_METHODS];

// Autocomplete
const { suggestions: shopSuggestions, search: searchShops } = useAutocomplete(autocompleteApi.getShops);
const { suggestions: categorySuggestions, search: searchCategories } = useAutocomplete(autocompleteApi.getCategories);

// Watch for expense changes and populate form
watch(
  () => props.expense,
  expense => {
    if (expense) {
      form.amount = expense.amount;
      form.currency = expense.originalCurrency;
      form.shopName = expense.shopName;
      form.productDescription = expense.productDescription;
      form.category = expense.category;
      form.paymentMethod = expense.paymentMethod;
      form.tags = [...expense.tags];
      form.purchaseDate = new Date(expense.purchaseDate);
    }
  },
  { immediate: true }
);

async function handleSubmit() {
  // Validate
  errors.amount = '';
  errors.shopName = '';

  if (!form.amount || form.amount <= 0) {
    errors.amount = 'Unesite iznos';
    return;
  }

  if (!form.shopName.trim()) {
    errors.shopName = 'Unesite naziv prodavnice';
    return;
  }

  loading.value = true;

  try {
    const updateData: UpdateExpenseDto = {
      amount: form.amount,
      currency: form.currency,
      shopName: form.shopName.trim(),
      purchaseDate: form.purchaseDate.toISOString()
    };

    // Add optional fields
    if (form.productDescription?.trim()) {
      updateData.productDescription = form.productDescription.trim();
    }
    if (form.category?.trim()) {
      updateData.category = form.category.trim();
    }
    if (form.paymentMethod?.trim()) {
      updateData.paymentMethod = form.paymentMethod.trim();
    }
    if (form.tags && form.tags.length > 0) {
      updateData.tags = form.tags;
    }

    await expenseApi.update(props.expense.id, updateData);

    showSuccess('Trošak je izmenjen');
    emit('success');
  } catch (error: any) {
    showError('Nije moguće izmeniti trošak', error);
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

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
}

.w-full {
  width: 100%;
}
</style>
