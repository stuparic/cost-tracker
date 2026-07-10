<template>
  <div class="income-breakdown">
    <div v-for="group in groups" :key="group.type" class="ib-group">
      <button class="ib-row" :aria-expanded="expanded === group.type" @click="toggle(group.type)">
        <span class="ib-icon">
          <i :class="group.icon"></i>
        </span>
        <span class="ib-body">
          <span class="ib-top">
            <span class="ib-name">{{ group.label }}</span>
            <span class="ib-amount">{{ formatNumber(group.total, false) }} <span class="ib-cur">RSD</span></span>
          </span>
          <span class="ib-bar-track">
            <span class="ib-bar" :style="{ width: group.pct + '%' }"></span>
          </span>
          <span class="ib-meta">{{ group.items.length }} {{ group.items.length === 1 ? 'uplata' : 'uplata' }} · {{ group.pct }}%</span>
        </span>
        <i class="pi ib-chevron" :class="expanded === group.type ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
      </button>

      <ul v-if="expanded === group.type" class="ib-items">
        <li v-for="item in group.items" :key="item.id" class="ib-item">
          <span class="ib-item-body">
            <span class="ib-item-title">{{ item.source }}</span>
            <span class="ib-item-meta">{{ formatRelativeDate(item.dateReceived) }} · {{ item.createdBy }}</span>
          </span>
          <span class="ib-item-amount">+{{ formatNumber(item.rsdAmount, false) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Income } from '@/types/income';
import { incomeTypeLabels, type IncomeType } from '@/types/income';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';

const props = defineProps<{ incomes: Income[] }>();

const { formatNumber, formatRelativeDate } = useTransactionFormatting();

const INCOME_TYPE_ICONS: Record<string, string> = {
  Salary: 'pi pi-wallet',
  Freelance: 'pi pi-pen-to-square',
  Rent: 'pi pi-building',
  Investment: 'pi pi-chart-line',
  Gift: 'pi pi-gift',
  Other: 'pi pi-circle'
};

const expanded = ref<string | null>(null);

function toggle(type: string) {
  expanded.value = expanded.value === type ? null : type;
}

const groups = computed(() => {
  const map = new Map<string, Income[]>();
  props.incomes.forEach(income => {
    const key = income.incomeType || 'Other';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(income);
  });

  const grandTotal = props.incomes.reduce((sum, i) => sum + i.rsdAmount, 0) || 1;

  return Array.from(map.entries())
    .map(([type, items]) => {
      const total = items.reduce((sum, i) => sum + i.rsdAmount, 0);
      return {
        type,
        label: incomeTypeLabels[type as IncomeType] ?? type,
        icon: INCOME_TYPE_ICONS[type] ?? INCOME_TYPE_ICONS.Other!,
        total,
        pct: Math.round((total / grandTotal) * 100),
        items: [...items].sort((a, b) => new Date(b.dateReceived).getTime() - new Date(a.dateReceived).getTime())
      };
    })
    .sort((a, b) => b.total - a.total);
});
</script>

<style scoped>
.income-breakdown {
  display: flex;
  flex-direction: column;
}

.ib-group {
  border-bottom: 1px solid var(--border-color);
}

.ib-group:last-child {
  border-bottom: none;
}

.ib-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 0.25rem;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.ib-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  background: var(--income-light);
  color: var(--income-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ib-icon i {
  font-size: 1rem;
}

.ib-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ib-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.ib-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.ib-amount {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--income-color);
  white-space: nowrap;
}

.ib-cur {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.ib-bar-track {
  height: 6px;
  border-radius: 3px;
  background: var(--surface-hover);
  overflow: hidden;
}

.ib-bar {
  display: block;
  height: 100%;
  border-radius: 3px;
  min-width: 3px;
  background: var(--income-color);
  transition: width 0.3s ease;
}

.ib-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.ib-chevron {
  font-size: 0.8rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.ib-items {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0.25rem 0.25rem 0 3.1rem;
}

.ib-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0;
  border-bottom: 1px dashed var(--border-color);
}

.ib-item:last-child {
  border-bottom: none;
}

.ib-item-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ib-item-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ib-item-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.ib-item-amount {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--income-color);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .ib-items {
    padding-left: 0.25rem;
  }
}
</style>
