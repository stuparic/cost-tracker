<template>
  <div class="insights">
    <p v-if="insights.length === 0" class="empty-note">Nema predloga — ovaj period izgleda uredno.</p>
    <article v-for="insight in visible" :key="insight.id" class="insight" :class="insight.severity">
      <header class="insight-head">
        <span class="severity-icon" :title="SEVERITY_META[insight.severity].label">
          <i :class="SEVERITY_META[insight.severity].icon"></i>
        </span>
        <div class="insight-heading">
          <span class="severity-label">{{ SEVERITY_META[insight.severity].label }}</span>
          <h4 class="insight-title">{{ insight.title }}</h4>
        </div>
        <span v-if="insight.monthlySaving" class="saving-chip" title="Procena mesečne uštede">
          ≈ {{ formatNumber(insight.monthlySaving, false) }} din/mes
        </span>
      </header>
      <p class="insight-body">{{ insight.body }}</p>
      <ul v-if="insight.items?.length" class="insight-items">
        <li v-for="item in insight.items" :key="item.label + (item.note ?? '')">
          <span class="item-label">{{ item.label }}</span>
          <span v-if="item.note" class="item-note">{{ item.note }}</span>
          <span class="item-amount">{{ formatNumber(item.amount, false) }}</span>
        </li>
      </ul>
      <p v-if="insight.action" class="insight-action"><i class="pi pi-arrow-right"></i>{{ insight.action }}</p>
    </article>
    <button v-if="insights.length > limit" class="more-btn" @click="expanded = !expanded">
      {{ expanded ? 'Prikaži manje' : `Prikaži sve predloge (${insights.length})` }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Insight } from '@/types/report';
import { SEVERITY_META } from '@/constants/report-categories';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';

const props = withDefaults(defineProps<{ insights: Insight[]; limit?: number }>(), { limit: 4 });
const { formatNumber } = useTransactionFormatting();

const expanded = ref(false);
const visible = computed(() => (expanded.value ? props.insights : props.insights.slice(0, props.limit)));
</script>

<style scoped>
.insights {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.insight {
  --tone: var(--primary-color);
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.875rem 1rem;
}

.insight.high {
  --tone: var(--expense-color);
}

.insight.medium {
  --tone: #c98500;
}

.insight.positive {
  --tone: var(--income-color);
}

.insight-head {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
}

.severity-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tone);
  background: color-mix(in srgb, var(--tone) 13%, transparent);
}

.insight-heading {
  flex: 1;
  min-width: 0;
}

.severity-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.insight-title {
  margin: 0.1rem 0 0;
  font-size: 0.975rem;
  line-height: 1.3;
  color: var(--text-primary);
}

.saving-chip {
  flex-shrink: 0;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  color: var(--income-dark);
  background: var(--income-light);
}

.insight-body {
  margin: 0.625rem 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.insight-items {
  list-style: none;
  margin: 0.625rem 0 0;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  background: var(--surface-hover);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.insight-items li {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.item-label {
  flex: 1;
  min-width: 0;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-note {
  color: var(--text-secondary);
  white-space: nowrap;
}

.item-amount {
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.insight-action {
  display: flex;
  gap: 0.5rem;
  margin: 0.625rem 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
  font-weight: 500;
  color: var(--text-primary);
}

.insight-action i {
  margin-top: 0.3rem;
  font-size: 0.7rem;
  color: var(--tone);
}

.more-btn {
  align-self: center;
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

.empty-note {
  color: var(--text-secondary);
  font-size: 0.875rem;
}
</style>
