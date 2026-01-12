<template>
  <div class="expense-form">
    <h2 class="form-title">{{ greeting }}</h2>

    <form @submit.prevent="handleSubmit">
      <!-- Amount Input - Big and Beautiful -->
      <div class="form-field amount-field">
        <label for="amount" class="field-label">Iznos *</label>
        <InputNumber
          id="amount"
          v-model="form.amount"
          mode="decimal"
          :minFractionDigits="2"
          :maxFractionDigits="2"
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

      <!-- Quick Amount Pills -->
      <div class="form-field">
        <label class="field-label">Brzi iznosi</label>
        <div class="quick-amounts-pills">
          <button
            v-for="amount in quickAmounts"
            :key="amount"
            type="button"
            class="quick-pill"
            @click="form.amount = amount"
          >
            {{ formatAmount(amount) }}
          </button>
        </div>
      </div>

      <!-- Shop Name Input -->
      <div class="form-field">
        <label for="shopName" class="field-label">Prodavnica *</label>
        <AutoComplete
          id="shopName"
          v-model="form.shopName"
          :suggestions="shopSuggestions"
          @complete="searchShops"
          @item-select="onShopSelect"
          @input="onShopInput"
          placeholder="Npr. Maxi, Lidl, IKEA..."
          class="shop-input"
          :class="{ 'p-invalid': errors.shopName }"
          completeOnFocus
        />
        <small v-if="errors.shopName" class="error-message">{{ errors.shopName }}</small>

        <!-- Category Inference Badge -->
        <div v-if="inferredCategory.isInferred && form.shopName" class="category-badge">
          <i :class="getConfidenceIcon(inferredCategory.confidence)"></i>
          <span>{{ inferredCategory.category }}</span>
          <span v-if="inferredCategory.confidence !== 'high'" class="editable-hint">
            (klikni za izmenu)
          </span>
        </div>
      </div>

      <!-- Product Description -->
      <div class="form-field">
        <label for="productDescription" class="field-label">Opis</label>
        <Textarea
          id="productDescription"
          v-model="form.productDescription"
          rows="2"
          placeholder="Šta ste kupili..."
          class="w-full"
        />
      </div>

      <!-- Category -->
      <div class="form-field">
        <label for="category" class="field-label">Kategorija</label>
        <AutoComplete
          id="category"
          v-model="form.category"
          :suggestions="categorySuggestions"
          @complete="searchCategories"
          placeholder="Odaberi kategoriju..."
          class="w-full"
        />
      </div>

      <!-- Payment Method -->
      <div class="form-field">
        <label for="paymentMethod" class="field-label">Način plaćanja</label>
        <Select
          id="paymentMethod"
          v-model="form.paymentMethod"
          :options="paymentMethods"
          placeholder="Odaberi..."
          class="w-full"
        />
      </div>

      <!-- Tags -->
      <div class="form-field">
        <label for="tags" class="field-label">Tagovi</label>
        <Chips
          id="tags"
          v-model="form.tags"
          placeholder="Dodaj tag..."
          class="w-full"
        />
      </div>

      <!-- Purchase Date -->
      <div class="form-field">
        <label for="purchaseDate" class="field-label">Datum kupovine</label>
        <DatePicker
          id="purchaseDate"
          v-model="purchaseDate"
          showTime
          hourFormat="24"
          dateFormat="dd.mm.yy"
          placeholder="Odaberi datum..."
          class="w-full"
        />
      </div>

      <!-- Submit Button -->
      <Button
        label="Sačuvaj"
        type="submit"
        :loading="loading"
        :disabled="!isFormValid"
        class="submit-btn"
        size="large"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Select from 'primevue/select';
import AutoComplete from 'primevue/autocomplete';
import Textarea from 'primevue/textarea';
import Chips from 'primevue/chips';
import DatePicker from 'primevue/datepicker';
import { useExpensesStore } from '@/stores/expenses';
import { useUserStore } from '@/stores/user';
import { autocompleteApi } from '@/api/autocomplete';
import { inferCategory, getConfidenceIcon } from '@/utils/category-inference';
import type { CreateExpenseDto, Currency } from '@/types/expense';
import type { CategoryInference } from '@/utils/category-inference';

const toast = useToast();
const expensesStore = useExpensesStore();
const userStore = useUserStore();

// Personalized greeting based on selected user
const greeting = computed(() => {
  if (userStore.selectedUser === 'svetla') {
    return 'Šta si kupila danas, Svetla?';
  } else if (userStore.selectedUser === 'dejan') {
    return 'Šta si potrošio danas, Dejane?';
  }
  return 'Brzi unos troška';
});

// Form state
const form = reactive({
  amount: null as number | null,
  currency: 'RSD' as Currency,
  shopName: '',
  productDescription: '',
  category: '',
  paymentMethod: 'Kartica',
  tags: [] as string[],
});

const purchaseDate = ref<Date>(new Date());
const loading = ref(false);

// Errors
const errors = reactive({
  amount: '',
  shopName: '',
});

// Quick amount buttons
const quickAmounts = [500, 1000, 2000, 5000];

// Currency options
const currencies = [
  { label: 'RSD', value: 'RSD' },
  { label: 'EUR', value: 'EUR' },
];

// Payment methods
const paymentMethods = ['Kartica', 'Keš', 'Online'];

// Autocomplete suggestions
const shopSuggestions = ref<string[]>([]);
const categorySuggestions = ref<string[]>([]);

// Category inference
const inferredCategory = ref<CategoryInference>({
  category: 'General',
  confidence: 'low',
  isInferred: false,
});

// Watch shop name for category inference
watch(() => form.shopName, (newShop) => {
  if (newShop && newShop.trim().length > 0) {
    inferredCategory.value = inferCategory(newShop);
    // ikona Auto-fill category if not already set by user
    if (!form.category) {
      form.category = inferredCategory.value.category;
    }
  } else {
    inferredCategory.value = {
      category: 'General',
      confidence: 'low',
      isInferred: false,
    };
  }
});

// Validation
const isFormValid = computed(() => {
  return form.amount && form.amount > 0 && form.shopName.trim().length > 0;
});

// Autocomplete handlers
async function searchShops(event: any) {
  try {
    const response = await autocompleteApi.getShops(event.query);
    shopSuggestions.value = response.suggestions.map(s => s.value);
  } catch (error) {
    console.error('Failed to load shop suggestions:', error);
    shopSuggestions.value = [];
  }
}

async function searchCategories(event: any) {
  try {
    const response = await autocompleteApi.getCategories(event.query);
    categorySuggestions.value = response.suggestions.map(s => s.value);
  } catch (error) {
    console.error('Failed to load category suggestions:', error);
    categorySuggestions.value = [];
  }
}

function onShopSelect() {
  // Re-trigger inference when shop is selected from autocomplete
  inferredCategory.value = inferCategory(form.shopName);
  if (!form.category) {
    form.category = inferredCategory.value.category;
  }
}

function onShopInput() {
  errors.shopName = '';
}

// Format amount for display
function formatAmount(amount: number): string {
  return amount.toLocaleString('sr-RS');
}

// Form submission
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
    const expenseData: CreateExpenseDto = {
      amount: form.amount,
      currency: form.currency,
      shopName: form.shopName.trim(),
      purchaseDate: purchaseDate.value.toISOString(),
      createdBy: userStore.selectedUser === 'svetla' ? 'Svetla' : 'Dejan',
    };

    // Add optional fields only if provided
    if (form.productDescription?.trim()) {
      expenseData.productDescription = form.productDescription.trim();
    }
    if (form.category?.trim()) {
      expenseData.category = form.category.trim();
    }
    if (form.paymentMethod?.trim()) {
      expenseData.paymentMethod = form.paymentMethod.trim();
    }
    if (form.tags && form.tags.length > 0) {
      expenseData.tags = form.tags;
    }

    await expensesStore.createExpense(expenseData);

    toast.add({
      severity: 'success',
      summary: 'Uspešno!',
      detail: 'Trošak je sačuvan',
      life: 3000,
    });

    // Reset form
    resetForm();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Greška',
      detail: error.response?.data?.message || 'Nije moguće sačuvati trošak',
      life: 5000,
    });
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.amount = null;
  form.currency = 'RSD';
  form.shopName = '';
  form.productDescription = '';
  form.category = '';
  form.paymentMethod = 'Kartica';
  form.tags = [];
  purchaseDate.value = new Date();
  inferredCategory.value = {
    category: 'General',
    confidence: 'low',
    isInferred: false,
  };
}
</script>

<style scoped>
.expense-form {
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
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 3px var(--primary-shadow) !important;
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
  border-color: var(--primary-color);
  background: #f0fdf4;
}

.currency-pill.active {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  border-color: var(--primary-color);
  color: white;
  box-shadow: 0 4px 12px var(--primary-shadow);
}

/* Quick Amount Pills */
.quick-amounts-pills {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.quick-pill {
  padding: 1rem 1.5rem;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-pill:hover {
  border-color: var(--primary-color);
  background: #f0fdf4;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--primary-shadow);
}

.quick-pill:active {
  transform: translateY(0);
}


.shop-input {
  width: 100%;
}

.category-badge {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: 0.75rem;
  padding: 0.625rem 1rem;
  background: linear-gradient(135deg, var(--primary-light) 0%, #d1fae5 100%);
  border: 1px solid #a7f3d0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #065f46;
  font-weight: 500;
}

.category-badge i {
  font-size: 1.125rem;
  color: var(--primary-color);
}

.editable-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-left: auto;
  font-weight: 400;
}


.submit-btn {
  width: 100%;
  padding: 1rem;
  font-size: 1.125rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  border: none;
  box-shadow: 0 4px 12px var(--primary-shadow);
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px var(--primary-shadow);
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

/* Mobile-first: Full-screen experience */
@media (max-width: 768px) {
  .expense-form {
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

  .quick-pill {
    padding: 0.875rem 1.25rem;
    font-size: 1.125rem;
  }

  .submit-btn {
    padding: 1.125rem;
    font-size: 1.0625rem;
    position: sticky;
    bottom: 0;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
    border-radius: 0;
    margin: 0 -1rem -1.25rem -1rem;
    width: calc(100% + 2rem);
  }
}

/* Tablet and desktop: Card layout */
@media (min-width: 769px) {
  .expense-form {
    border-radius: 1rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    margin-top: 0;
  }

  .submit-btn {
    border-radius: 0.75rem;
  }
}
</style>
