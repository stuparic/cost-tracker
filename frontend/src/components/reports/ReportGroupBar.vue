<template>
  <div class="group-root">
    <div class="group-bar" role="img" :aria-label="ariaLabel">
      <span
        v-for="group in visibleGroups"
        :key="group.group"
        v-tooltip.top="`${group.label}: ${formatNumber(group.amount, false)} din (${Math.round(group.share * 100)}%)`"
        class="group-seg"
        :class="group.group"
        :style="{ flexGrow: group.amount }"
      ></span>
    </div>
    <ul class="group-legend">
      <li v-for="group in groups" :key="group.group" class="legend-row">
        <span class="swatch" :class="group.group"></span>
        <span class="legend-label">{{ group.label }}</span>
        <span class="legend-value">{{ formatNumber(group.amount, false) }}</span>
        <span class="legend-share">{{ Math.round(group.share * 100) }}%</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GroupLine } from '@/types/report';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';

const props = defineProps<{ groups: GroupLine[] }>();
const { formatNumber } = useTransactionFormatting();

const visibleGroups = computed(() => props.groups.filter(group => group.amount > 0));
const ariaLabel = computed(() => props.groups.map(group => `${group.label} ${Math.round(group.share * 100)}%`).join(', '));
</script>

<style scoped>
/* Categorical slots 1-3 of the validated chart palette (light / dark) */
.group-root {
  --group-fixed: #2a78d6;
  --group-variable: #eb6834;
  --group-cash: #1baf7a;
}

:global(:root.dark-mode) .group-root {
  --group-fixed: #3987e5;
  --group-variable: #d95926;
  --group-cash: #199e70;
}

.group-bar {
  display: flex;
  gap: 2px;
  height: 14px;
  margin-bottom: 0.75rem;
}

.group-seg {
  flex-basis: 0;
  min-width: 4px;
}

.group-seg:first-child {
  border-radius: 4px 0 0 4px;
}

.group-seg:last-child {
  border-radius: 0 4px 4px 0;
}

.group-seg:only-child {
  border-radius: 4px;
}

.fixed {
  background: var(--group-fixed);
}

.variable {
  background: var(--group-variable);
}

.cash {
  background: var(--group-cash);
}

.group-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.legend-row {
  display: grid;
  grid-template-columns: 10px 1fr auto 3rem;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.legend-label {
  color: var(--text-primary);
}

.legend-value {
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.legend-share {
  text-align: right;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
