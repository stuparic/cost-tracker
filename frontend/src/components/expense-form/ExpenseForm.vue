<template>
  <div class="expense-form">
    <h2 class="form-title">Brzi unos troška</h2>

    <form @submit.prevent="handleSubmit">
      <!-- Amount Input -->
      <div class="form-field">
        <label for="amount" class="field-label">Iznos *</label>
        <div class="amount-input-group">
          <InputNumber
            id="amount"
            v-model="form.amount"
            mode="decimal"
            :minFractionDigits="2"
            :maxFractionDigits="2"
            :min="0.01"
            placeholder="0.00"
            class="amount-input"
            :class="{ 'p-invalid': errors.amount }"
            @input="errors.amount = ''"
          />
          <Select
            v-model="form.currency"
            :options="currencies"
            optionLabel="label"
            optionValue="value"
            class="currency-select"
          />
        </div>
        <small v-if="errors.amount" class="error-message">{{ errors.amount }}</small>
      </div>

      <!-- Quick Amount Buttons -->
      <div class="quick-amounts">
        <span class="quick-label">Brzo:</span>
        <Button
          v-for="amount in quickAmounts"
          :key="amount"
          :label="amount.toString()"
          @click="form.amount = amount"
          outlined
          size="small"
          class="quick-btn"
          type="button"
        />
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

      <!-- Collapsible Details Section -->
      <div class="details-section">
        <Button
          :label="showDetails ? 'Sakrij detalje' : '+ Više detalja'"
          @click="showDetails = !showDetails"
          text
          size="small"
          class="toggle-details-btn"
          type="button"
        />

        <div v-show="showDetails" class="details-content">
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
        </div>
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
import { autocompleteApi } from '@/api/autocomplete';
import { inferCategory, getConfidenceIcon } from '@/utils/category-inference';
import { getCurrentDateTimeISO } from '@/utils/formatters';
import type { CreateExpenseDto, Currency } from '@/types/expense';
import type { CategoryInference } from '@/utils/category-inference';

const toast = useToast();
const expensesStore = useExpensesStore();

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
const showDetails = ref(false);
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
    // Auto-fill category if not already set by user
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
  showDetails.value = false;
  inferredCategory.value = {
    category: 'General',
    confidence: 'low',
    isInferred: false,
  };
}
</script>

<style scoped>
.expense-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.form-field {
  margin-bottom: 1.25rem;
}

.field-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #4a5568;
  font-size: 0.95rem;
}

.amount-input-group {
  display: flex;
  gap: 0.5rem;
}

.amount-input {
  flex: 1;
}

.currency-select {
  width: 100px;
}

.quick-amounts {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.quick-label {
  font-size: 0.875rem;
  color: #718096;
  font-weight: 500;
}

.quick-btn {
  min-width: 60px;
}

.shop-input {
  width: 100%;
}

.category-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f0f9ff;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #0369a1;
}

.category-badge i {
  font-size: 1rem;
}

.editable-hint {
  font-size: 0.75rem;
  color: #64748b;
  margin-left: auto;
}

.details-section {
  margin: 1.5rem 0;
}

.toggle-details-btn {
  margin-bottom: 1rem;
}

.details-content {
  padding-top: 0.5rem;
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.error-message {
  color: #dc2626;
  display: block;
  margin-top: 0.25rem;
}

.p-invalid {
  border-color: #dc2626;
}

.w-full {
  width: 100%;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .expense-form {
    padding: 1rem;
    border-radius: 0;
    box-shadow: none;
  }

  .form-title {
    font-size: 1.25rem;
  }

  .quick-amounts {
    justify-content: space-between;
  }

  .quick-btn {
    flex: 1;
    min-width: 0;
  }
}
</style>
