<template>
  <div class="category-breakdown">
    <div v-for="group in groups" :key="group.category" class="cb-group">
      <button class="cb-row" :aria-expanded="expanded === group.category" @click="toggle(group.category)">
        <span class="cb-icon" :style="{ color: group.color, background: group.color + '21' }">
          <i :class="group.icon"></i>
        </span>
        <span class="cb-body">
          <span class="cb-top">
            <span class="cb-name">{{ group.label }}</span>
            <span class="cb-amount">{{ formatNumber(group.total, false) }} <span class="cb-cur">RSD</span></span>
          </span>
          <span class="cb-bar-track">
            <span class="cb-bar" :style="{ width: group.pct + '%', background: group.color }"></span>
          </span>
          <span class="cb-meta">{{ group.items.length }} {{ group.items.length === 1 ? 'stavka' : 'stavki' }} · {{ group.pct }}%</span>
        </span>
        <i class="pi cb-chevron" :class="expanded === group.category ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
      </button>

      <ul v-if="expanded === group.category" class="cb-items">
        <li v-for="item in group.items" :key="item.id" class="cb-item">
          <span class="cb-item-body">
            <span class="cb-item-title">{{ itemTitle(item) }}</span>
            <span class="cb-item-meta">
              {{ formatRelativeDate(item.purchaseDate) }} · {{ item.createdBy }}
              <span v-if="(item.tags || []).includes('putovanje')" class="cb-tag">putovanje</span>
            </span>
          </span>
          <span class="cb-item-amount">{{ formatNumber(item.rsdAmount, false) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Expense } from '@/types/expense';
import { CATEGORY_LABELS, type ExpenseCategory } from '@/constants/categories';
import { categoryColor, categoryIcon } from '@/constants/category-style';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';

const props = defineProps<{ expenses: Expense[] }>();

const { formatNumber, formatRelativeDate } = useTransactionFormatting();

const expanded = ref<string | null>(null);

function toggle(category: string) {
  expanded.value = expanded.value === category ? null : category;
}

/** Statement imports sometimes carry a generic shop name - fall back to the description */
function itemTitle(item: Expense): string {
  const generic = !item.shopName || /^(other|nepoznato|unknown)$/i.test(item.shopName.trim());
  if (!generic) return item.shopName;
  const desc = (item.productDescription || '')
    .replace(/^Notifikacija:\s*/i, '')
    .replace(/^GooglePay\s+/i, '')
    .replace(/^QR placanja - /i, '')
    .split(' Kurs:')[0]!
    .trim();
  return desc || item.shopName || 'Nepoznato';
}

const groups = computed(() => {
  const map = new Map<string, Expense[]>();
  props.expenses.forEach(expense => {
    const key = expense.category || 'Other';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(expense);
  });

  const grandTotal = props.expenses.reduce((sum, e) => sum + e.rsdAmount, 0) || 1;

  return Array.from(map.entries())
    .map(([category, items]) => {
      const total = items.reduce((sum, e) => sum + e.rsdAmount, 0);
      return {
        category,
        label: CATEGORY_LABELS[category as ExpenseCategory] ?? category,
        icon: categoryIcon(category),
        color: categoryColor(category),
        total,
        pct: Math.round((total / grandTotal) * 100),
        items: [...items].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      };
    })
    .sort((a, b) => b.total - a.total);
});
</script>

<style scoped>
.category-breakdown {
  display: flex;
  flex-direction: column;
}

.cb-group {
  border-bottom: 1px solid var(--border-color);
}

.cb-group:last-child {
  border-bottom: none;
}

.cb-row {
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

.cb-row:hover .cb-name {
  color: var(--primary-color);
}

.cb-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cb-icon i {
  font-size: 1rem;
}

.cb-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.cb-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.cb-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.cb-amount {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}

.cb-cur {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.cb-bar-track {
  height: 6px;
  border-radius: 3px;
  background: var(--surface-hover);
  overflow: hidden;
}

.cb-bar {
  display: block;
  height: 100%;
  border-radius: 3px;
  min-width: 3px;
  transition: width 0.3s ease;
}

.cb-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.cb-chevron {
  font-size: 0.8rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.cb-items {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0.25rem 0.25rem 0 3.1rem;
}

.cb-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0;
  border-bottom: 1px dashed var(--border-color);
}

.cb-item:last-child {
  border-bottom: none;
}

.cb-item-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.cb-item-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cb-item-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.cb-tag {
  display: inline-block;
  margin-left: 0.375rem;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: var(--income-light);
  color: var(--income-color);
  font-size: 0.6875rem;
  font-weight: 600;
}

.cb-item-amount {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--expense-color);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .cb-items {
    padding-left: 0.25rem;
  }
}
</style>
