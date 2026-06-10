<template>
  <div class="doughnut-chart-container">
    <Chart type="doughnut" :data="chartData" :options="chartOptions" :plugins="[centerTextPlugin]" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Chart from 'primevue/chart';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { Plugin } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  labels: string[];
  data: number[];
  colors: string[];
  centerText?: string;
  centerSubtext?: string;
}

const props = withDefaults(defineProps<Props>(), {
  centerText: '',
  centerSubtext: ''
});

// Custom plugin to draw text in the center of the doughnut chart.
// Passed per chart instance (NOT registered globally) so each chart only
// draws its own center text and theme colors are resolved at draw time.
const centerTextPlugin: Plugin = {
  id: 'centerText',
  beforeDraw(chart: any) {
    if (!props.centerText) return;

    const { ctx, chartArea } = chart;
    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;
    const rootStyle = getComputedStyle(document.documentElement);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw main text
    ctx.font = 'bold 1.75rem Inter, system-ui, sans-serif';
    ctx.fillStyle = rootStyle.getPropertyValue('--text-primary').trim() || '#1f2937';
    ctx.fillText(props.centerText, centerX, props.centerSubtext ? centerY - 15 : centerY);

    // Draw subtext if provided
    if (props.centerSubtext) {
      ctx.font = '0.875rem Inter, system-ui, sans-serif';
      ctx.fillStyle = rootStyle.getPropertyValue('--text-secondary').trim() || '#6b7280';
      ctx.fillText(props.centerSubtext, centerX, centerY + 15);
    }

    ctx.restore();
  }
};

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.data,
      backgroundColor: props.colors,
      borderWidth: 0,
      hoverOffset: 8
    }
  ]
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  cutout: '70%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 16,
        font: {
          size: 13,
          family: 'Inter, system-ui, sans-serif'
        },
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      cornerRadius: 8,
      titleFont: {
        size: 14
      },
      bodyFont: {
        size: 13
      },
      callbacks: {
        label(context: any) {
          const label = context.label || '';
          const value = context.parsed || 0;
          const formatted = new Intl.NumberFormat('sr-RS', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(value);
          return `${label}: ${formatted} RSD`;
        }
      }
    }
  }
}));
</script>

<style scoped>
.doughnut-chart-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}
</style>
