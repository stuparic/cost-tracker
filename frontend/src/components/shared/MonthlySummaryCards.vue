<template>
  <div class="monthly-summaries">
    <div
      v-for="summary in summaries"
      :key="summary.month"
      class="summary-card"
      :class="{ loading: loading }"
    >
      <div class="summary-month">{{ summary.monthName }}</div>
      <div class="summary-amount-row">
        <span class="summary-amount">{{ formatAmount(summary.totalRsd, false) }}</span>
        <span class="summary-currency">RSD</span>
      </div>
      <div class="summary-amount-secondary">{{ formatAmount(summary.totalEur, true) }} EUR</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface MonthlySummary {
  month: string;
  monthName: string;
  totalRsd: number;
  totalEur: number;
}

defineProps<{
  summaries: MonthlySummary[];
  loading: boolean;
}>();

function formatAmount(amount: number, showDecimals: boolean = true): string {
  return new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}
</script>

<style scoped>
.monthly-summaries {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: white;
  padding: 1.25rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.summary-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.summary-card.loading {
  opacity: 0.6;
  pointer-events: none;
}

.summary-month {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 0.75rem;
}

.summary-amount-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.summary-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.summary-currency {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 600;
}

.summary-amount-secondary {
  font-size: 0.875rem;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .monthly-summaries {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .summary-card {
    padding: 1rem;
  }

  .summary-amount {
    font-size: 1.25rem;
  }
}
</style>
