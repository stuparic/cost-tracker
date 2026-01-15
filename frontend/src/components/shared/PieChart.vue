<template>
  <div class="pie-chart-container">
    <Chart type="pie" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Chart from 'primevue/chart';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  labels: string[];
  data: number[];
  colors: string[];
}

const props = defineProps<Props>();

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.data,
      backgroundColor: props.colors,
      borderWidth: 0,
      hoverOffset: 8,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        padding: 12,
        font: {
          size: 12,
          family: 'Inter, system-ui, sans-serif',
        },
        usePointStyle: true,
        pointStyle: 'circle',
        generateLabels(chart: any) {
          const data = chart.data;
          if (data.labels.length && data.datasets.length) {
            return data.labels.map((label: string, i: number) => {
              const value = data.datasets[0].data[i];
              const formatted = new Intl.NumberFormat('sr-RS', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value);
              return {
                text: `${label}: ${formatted} RSD`,
                fillStyle: data.datasets[0].backgroundColor[i],
                hidden: false,
                index: i,
              };
            });
          }
          return [];
        },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      cornerRadius: 8,
      titleFont: {
        size: 14,
      },
      bodyFont: {
        size: 13,
      },
      callbacks: {
        label(context: any) {
          const label = context.label || '';
          const value = context.parsed || 0;
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          const formatted = new Intl.NumberFormat('sr-RS', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value);
          return `${label}: ${formatted} RSD (${percentage}%)`;
        },
      },
    },
  },
}));
</script>

<style scoped>
.pie-chart-container {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .pie-chart-container :deep(.p-chart) {
    max-height: 300px;
  }
}
</style>