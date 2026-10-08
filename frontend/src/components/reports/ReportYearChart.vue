<template>
  <div class="year-chart">
    <div class="columns" role="list" aria-label="Ušteđeno po mesecima">
      <button
        v-for="month in months"
        :key="month.period"
        v-tooltip.top="tooltip(month)"
        role="listitem"
        class="column"
        :class="[month.status, { selected: month.period === selected }]"
        :disabled="month.status !== 'imported'"
        @click="emit('select', month.period)"
      >
        <span class="plot">
          <span class="half up" :style="{ height: `${upShare}%` }">
            <span
              v-if="(month.summary?.net ?? 0) > 0"
              class="bar positive"
              :style="{ height: barHeight(month.summary!.net, maxUp) }"
            ></span>
          </span>
          <span class="half down" :style="{ height: `${100 - upShare}%` }">
            <span
              v-if="(month.summary?.net ?? 0) < 0"
              class="bar negative"
              :style="{ height: barHeight(-month.summary!.net, maxDown) }"
            ></span>
          </span>
          <span v-if="month.status === 'missing'" class="gap-label">fali</span>
        </span>
        <span class="month-label">{{ MONTH_NAMES[month.month - 1]?.slice(0, 3) }}</span>
      </button>
    </div>
    <p class="chart-legend">
      <span class="legend-item"><span class="swatch positive"></span>ušteđeno</span>
      <span class="legend-item"><span class="swatch negative"></span>potrošeno više nego što je ušlo</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { YearMonth } from '@/types/report';
import { MONTH_NAMES } from '@/constants/app';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';

const props = defineProps<{ months: YearMonth[]; selected?: string | null }>();
const emit = defineEmits<{ select: [period: string] }>();
const { formatNumber } = useTransactionFormatting();

const nets = computed(() => props.months.map(month => month.summary?.net ?? 0));
const maxUp = computed(() => Math.max(0, ...nets.value));
const maxDown = computed(() => Math.max(0, ...nets.value.map(net => -net)));

/** Share of the plot height above the zero line, so both arms use one scale */
const upShare = computed(() => {
  const total = maxUp.value + maxDown.value;
  if (total === 0) return 50;
  return Math.round((maxUp.value / total) * 100);
});

function barHeight(value: number, max: number): string {
  if (max === 0) return '0%';
  return `${Math.max(4, (value / max) * 100)}%`;
}

function tooltip(month: YearMonth): string {
  const name = MONTH_NAMES[month.month - 1] ?? month.period;
  if (month.status === 'missing') return `${name}: nema izvoda`;
  if (month.status === 'upcoming') return `${name}: izvod još nije izašao`;
  const s = month.summary!;
  const sign = s.net >= 0 ? '+' : '−';
  return `${name}: ušteđeno ${sign}${formatNumber(Math.abs(s.net), false)} din · prilivi ${formatNumber(s.inflows, false)} · troškovi ${formatNumber(s.spending, false)}`;
}
</script>

<style scoped>
.columns {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2px;
}

.column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0 0.375rem;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  min-width: 0;
}

.column:disabled {
  cursor: default;
}

.column.imported:hover,
.column.selected {
  background: var(--surface-hover);
}

.plot {
  position: relative;
  width: 100%;
  height: 120px;
  display: flex;
  flex-direction: column;
}

.half {
  display: flex;
  justify-content: center;
  width: 100%;
}

.half.up {
  align-items: flex-end;
  border-bottom: 1px solid var(--border-color);
}

.half.down {
  align-items: flex-start;
}

.bar {
  width: min(60%, 22px);
}

.bar.positive {
  background: var(--income-color);
  border-radius: 4px 4px 0 0;
}

.bar.negative {
  background: var(--expense-color);
  border-radius: 0 0 4px 4px;
}

.gap-label {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(-90deg);
  font-size: 0.65rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.month-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.column.selected .month-label {
  color: var(--text-primary);
}

.column.upcoming .month-label {
  opacity: 0.5;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.swatch.positive {
  background: var(--income-color);
}

.swatch.negative {
  background: var(--expense-color);
}
</style>
