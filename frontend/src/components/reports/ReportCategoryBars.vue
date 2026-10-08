<template>
  <div class="cat-bars">
    <p v-if="hasAverages" class="cat-legend">
      <span class="legend-item"><span class="legend-bar"></span>{{ mode === 'year' ? 'ukupno' : 'ovaj mesec' }}</span>
      <span class="legend-item"><span class="legend-tick"></span>{{ mode === 'year' ? 'mesečni prosek' : 'prosek ostalih meseci' }}</span>
    </p>
    <ul class="cat-list">
      <li v-for="line in lines" :key="line.category">
        <button
          class="cat-row"
          :class="{ active: selected === line.category }"
          :aria-pressed="selected === line.category"
          :title="tooltip(line)"
          @click="emit('select', line.category)"
        >
          <span class="cat-icon"><i :class="reportCategoryIcon(line.category)"></i></span>
          <span class="cat-body">
            <span class="cat-top">
              <span class="cat-name">{{ line.label }}</span>
              <span class="cat-amount">{{ formatNumber(line.amount, false) }}</span>
            </span>
            <span class="cat-track" aria-hidden="true">
              <span class="cat-fill" :style="{ width: widthOf(line.amount) }"></span>
              <span
                v-if="mode === 'month' && line.average !== null && line.average > 0"
                class="cat-avg"
                :style="{ left: widthOf(line.average) }"
              ></span>
            </span>
            <span class="cat-meta">
              <span>{{ Math.round(line.share * 100) }}% · {{ line.count }} {{ plural(line.count, 'stavka', 'stavke', 'stavki') }}</span>
              <template v-if="mode === 'year'">
                <span v-if="line.average !== null">≈ {{ formatNumber(line.average, false) }} mesečno</span>
              </template>
              <span v-else-if="deltaOf(line) !== null" class="cat-delta" :class="deltaOf(line)! > 0 ? 'up' : 'down'">
                <i :class="deltaOf(line)! > 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i>
                {{ formatNumber(Math.abs(deltaOf(line)!), false) }} od proseka
              </span>
            </span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CategoryLine } from '@/types/report';
import { reportCategoryIcon } from '@/constants/report-categories';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';
import { plural } from '@/utils/plural';

const props = defineProps<{
  lines: CategoryLine[];
  /** month: bar = this month, tick = average of other months; year: bar = year total */
  mode: 'month' | 'year';
  selected?: string | null;
}>();

const emit = defineEmits<{ select: [category: string] }>();

const { formatNumber } = useTransactionFormatting();

/** Loan installments are contractual; their month-to-month "change" is just which account paid them */
const NO_COMPARISON = new Set(['HomeLoan', 'CarLoan']);

const hasAverages = computed(() => props.mode === 'month' && props.lines.some(line => line.average !== null && line.average > 0));

// Bars and average ticks share one scale so they can be compared directly
const scaleMax = computed(() =>
  Math.max(1, ...props.lines.map(line => line.amount), ...(props.mode === 'month' ? props.lines.map(line => line.average ?? 0) : []))
);

function widthOf(value: number): string {
  return `${Math.max(0, Math.min(100, (value / scaleMax.value) * 100))}%`;
}

/** Difference to the average of other months, hidden when it is noise (< 1.000 din) */
function deltaOf(line: CategoryLine): number | null {
  if (line.average === null || NO_COMPARISON.has(line.category)) return null;
  const delta = line.amount - line.average;
  return Math.abs(delta) >= 1000 ? delta : null;
}

function tooltip(line: CategoryLine): string {
  const parts = [`${line.label}: ${formatNumber(line.amount, false)} din`, `${Math.round(line.share * 100)}% troškova`];
  if (line.average !== null) parts.push(`${props.mode === 'year' ? 'mesečno' : 'prosek'} ${formatNumber(line.average, false)} din`);
  return parts.join(' · ');
}
</script>

<style scoped>
.cat-legend {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.legend-bar {
  width: 14px;
  height: 8px;
  border-radius: 0 4px 4px 0;
  background: var(--primary-color);
}

.legend-tick {
  width: 2px;
  height: 12px;
  background: var(--text-primary);
}

.cat-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cat-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.625rem 0.5rem;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-family: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.cat-row:hover,
.cat-row.active {
  background: var(--surface-hover);
}

.cat-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-hover);
  color: var(--text-secondary);
}

.cat-row.active .cat-icon {
  background: var(--primary-light);
  color: var(--primary-color);
}

.cat-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.cat-top {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.cat-name {
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-amount {
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cat-track {
  position: relative;
  height: 8px;
  border-radius: 0 4px 4px 0;
  background: var(--surface-hover);
}

.cat-row:hover .cat-track,
.cat-row.active .cat-track {
  background: var(--border-color);
}

.cat-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 0 4px 4px 0;
  background: var(--primary-color);
}

.cat-avg {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 14px;
  margin-left: -1px;
  background: var(--text-primary);
  box-shadow: 0 0 0 2px var(--surface-card);
}

.cat-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.cat-delta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
}

.cat-delta i {
  font-size: 0.65rem;
}

.cat-delta.up {
  color: var(--expense-color);
}

.cat-delta.down {
  color: var(--income-color);
}
</style>
