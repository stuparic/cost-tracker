<template>
  <div class="uncat">
    <ul class="uncat-list">
      <li v-for="item in visible" :key="item.merchantKey" class="uncat-row">
        <div class="uncat-top">
          <span class="uncat-info">
            <span class="uncat-name">{{ item.merchant }}</span>
            <span class="uncat-meta">{{ item.count }}× · {{ monthsLabel(item.periods) }}</span>
          </span>
          <span class="uncat-amount">{{ formatNumber(item.amount, false) }}</span>
        </div>
        <p class="uncat-desc">{{ item.description }}</p>
        <div v-if="item.perTransaction" class="uncat-months">
          <span>Opis ne kaže kome je plaćeno — razvrstaj stavku po stavku:</span>
          <button v-for="period in item.periods" :key="period" class="month-link" @click="emit('open-month', period)">
            {{ monthShort(period) }}
          </button>
        </div>
        <Select
          v-else
          :key="`${item.merchantKey}:${resetKey}`"
          :model-value="null"
          :options="options"
          option-label="label"
          option-value="value"
          option-group-label="label"
          option-group-children="items"
          placeholder="Izaberi kategoriju"
          class="uncat-select"
          :loading="savingKey === item.merchantKey"
          :disabled="savingKey !== null"
          @update:model-value="(value: string) => save(item, value)"
        >
          <template #option="{ option }">
            <span class="option"><i :class="option.icon"></i>{{ option.label }}</span>
          </template>
        </Select>
      </li>
    </ul>
    <button v-if="items.length > limit && !expanded" class="more-btn" @click="expanded = true">Prikaži sve ({{ items.length }})</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Select from 'primevue/select';
import type { UncategorizedMerchant } from '@/types/report';
import { categoryOptionGroups, reportCategoryLabel } from '@/constants/report-categories';
import { MONTH_NAMES } from '@/constants/app';
import { reportsApi } from '@/api/reports';
import { useAppToast } from '@/composables/useAppToast';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';

const props = withDefaults(defineProps<{ items: UncategorizedMerchant[]; limit?: number }>(), { limit: 12 });
const emit = defineEmits<{ saved: []; 'open-month': [period: string] }>();

const { formatNumber } = useTransactionFormatting();
const { showError, showSuccess } = useAppToast();

const options = categoryOptionGroups('debit');
const expanded = ref(false);
const savingKey = ref<string | null>(null);
/** Re-mounts the selects so a failed save doesn't leave a choice showing that was never stored */
const resetKey = ref(0);

const visible = computed(() => (expanded.value ? props.items : props.items.slice(0, props.limit)));

function monthShort(period: string): string {
  return MONTH_NAMES[Number(period.slice(5, 7)) - 1]?.slice(0, 3) ?? period;
}

function monthsLabel(periods: string[]): string {
  return [...periods].sort().map(monthShort).join(', ');
}

/** One choice re-categorizes the merchant in every month (and future statements) */
async function save(item: UncategorizedMerchant, category: string): Promise<void> {
  savingKey.value = item.merchantKey;
  try {
    await reportsApi.updateCategory({ scope: 'merchant', merchantKey: item.merchantKey, transactionId: item.transactionId, category });
    showSuccess(`${item.merchant} → ${reportCategoryLabel(category)}, u svim mesecima`, 'Razvrstano');
    emit('saved');
  } catch (error) {
    showError('Čuvanje kategorije nije uspelo', error);
    resetKey.value++;
  } finally {
    savingKey.value = null;
  }
}
</script>

<style scoped>
.uncat-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.uncat-row {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.uncat-row:last-child {
  border-bottom: none;
}

.uncat-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.uncat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.uncat-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uncat-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.uncat-amount {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.uncat-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  word-break: break-word;
}

.uncat-select {
  width: 100%;
}

.option {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.uncat-months {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.month-link {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: transparent;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary-color);
  cursor: pointer;
}

.month-link:hover {
  background: var(--primary-light);
}

.more-btn {
  display: block;
  margin: 0.75rem auto 0;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 999px;
  background: var(--surface-hover);
  color: var(--primary-color);
  font-family: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
}
</style>
