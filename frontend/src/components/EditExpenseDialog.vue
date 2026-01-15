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
        <div class="currency-pills">
          <button
            v-for="curr in currencies"
            :key="curr.value"
            type="button"
            class="currency-pill"
            :class="{ active: form.currency === curr.value }"
            @click="form.currency = curr.value"
          >
            {{ curr.label }}
          </button>
        </div>
      </div>

      <!-- Shop Name -->
      <div class="form-field">
        <label for="edit-shop" class="field-label">Prodavnica *</label>
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
        <Textarea
          id="edit-description"
          v-model="form.productDescription"
          rows="2"
          class="w-full"
        />
      </div>

      <!-- Payment Method -->
      <div class="form-field">
        <label for="edit-payment" class="field-label">Način plaćanja</label>
        <Select
          id="edit-payment"
          v-model="form.paymentMethod"
          :options="paymentMethods"
          class="w-full"
        />
      </div>

      <!-- Tags -->
      <div class="form-field">
        <label for="edit-tags" class="field-label">Oznake</label>
        <Chips
          id="edit-tags"
          v-model="form.tags"
          separator=","
          class="w-full"
        />
      </div>

      <!-- Purchase Date -->
      <div class="form-field">
        <label for="edit-date" class="field-label">Datum kupovine</label>
        <DatePicker
          id="edit-date"
          v-model="form.purchaseDate"
          show-time
          hour-format="24"
          date-format="dd.mm.yy"
          class="w-full"
        />
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
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import AutoComplete from 'primevue/autocomplete';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Chips from 'primevue/chips';
import DatePicker from 'primevue/datepicker';
import { expenseApi } from '@/api/expenses';
import { autocompleteApi } from '@/api/autocomplete';
import type { Expense, UpdateExpenseDto, Currency } from '@/types/expense';

const props = defineProps<{
  visible: boolean;
  expense: Expense;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}>();

const toast = useToast();

// Form state
const form = reactive({
  amount: 0,
  currency: 'RSD' as Currency,
  shopName: '',
  productDescription: '',
  category: '',
  paymentMethod: '',
  tags: [] as string[],
  purchaseDate: new Date(),
});

// Errors
const errors = reactive({
  amount: '',
  shopName: '',
});

const loading = ref(false);

// Options
const currencies: Array<{ label: string; value: Currency }> = [
  { label: 'RSD', value: 'RSD' },
  { label: 'EUR', value: 'EUR' },
];

const paymentMethods = ['Kartica', 'Keš', 'Online'];

// Autocomplete
const shopSuggestions = ref<string[]>([]);
const categorySuggestions = ref<string[]>([]);

// Watch for expense changes and populate form
watch(() => props.expense, (expense) => {
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
}, { immediate: true });

async function searchShops(event: any) {
  try {
    const response = await autocompleteApi.getShops(event.query);
    shopSuggestions.value = response.suggestions.map((s: any) => s.value);
  } catch (error) {
    console.error('Failed to load shop suggestions:', error);
    shopSuggestions.value = [];
  }
}

async function searchCategories(event: any) {
  try {
    const response = await autocompleteApi.getCategories(event.query);
    categorySuggestions.value = response.suggestions.map((s: any) => s.value);
  } catch (error) {
    console.error('Failed to load category suggestions:', error);
    categorySuggestions.value = [];
  }
}

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
      purchaseDate: form.purchaseDate.toISOString(),
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

    toast.add({
      severity: 'success',
      summary: 'Uspešno!',
      detail: 'Trošak je izmenjen',
      life: 3000,
    });

    emit('success');
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Greška',
      detail: error.response?.data?.message || 'Nije moguće izmeniti trošak',
      life: 5000,
    });
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

.currency-pills {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.currency-pill {
  padding: 0.5rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 2rem;
  background: white;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.currency-pill:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.currency-pill.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
}

.w-full {
  width: 100%;
}
</style>
