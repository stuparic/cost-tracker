<template>
  <div class="reports-view">
    <header class="reports-head">
      <div>
        <h2 class="page-title">Izveštaj</h2>
        <p class="page-subtitle">Iz mesečnih izvoda banke — kuda idu pare i šta može bolje. Podaci kasne mesec dana, dok izvod ne izađe.</p>
      </div>
      <input ref="fileInput" type="file" accept="application/pdf,.pdf" multiple hidden @change="onFilesChosen" />
      <Button
        :label="uploading ? 'Uvozim…' : 'Uvezi izvod'"
        icon="pi pi-upload"
        :loading="uploading"
        class="upload-btn"
        @click="fileInput?.click()"
      />
    </header>

    <!-- Year + month picker -->
    <section class="period-picker" aria-label="Izbor perioda">
      <div class="year-nav">
        <Button icon="pi pi-chevron-left" text rounded aria-label="Prethodna godina" @click="changeYear(-1)" />
        <span class="year-label">{{ year }}</span>
        <Button
          icon="pi pi-chevron-right"
          text
          rounded
          aria-label="Sledeća godina"
          :disabled="year >= currentYear"
          @click="changeYear(1)"
        />
      </div>
      <div ref="monthChips" class="month-chips">
        <button class="month-chip year-chip" :class="{ active: selected === 'year' }" @click="selectYear">Cela godina</button>
        <button
          v-for="month in overview?.months ?? []"
          :key="month.period"
          class="month-chip"
          :class="[month.status, { active: selected === month.period }]"
          :disabled="month.status !== 'imported'"
          :title="
            month.status === 'missing' ? 'Nema izvoda za ovaj mesec' : month.status === 'upcoming' ? 'Izvod još nije izašao' : undefined
          "
          @click="selectMonth(month.period)"
        >
          {{ MONTH_NAMES[month.month - 1]?.slice(0, 3) }}
          <i v-if="month.status === 'missing'" class="pi pi-exclamation-circle" aria-label="fali izvod"></i>
        </button>
      </div>
    </section>

    <div v-if="loadingOverview && !overview" class="loading"><i class="pi pi-spinner pi-spin"></i></div>

    <!-- Nothing imported for this year yet -->
    <section v-else-if="overview && overview.totals.months === 0" class="empty-state">
      <i class="pi pi-file-pdf empty-icon"></i>
      <h3>Nema uvezenih izvoda za {{ year }}.</h3>
      <p>
        Preuzmi mesečne PDF izvode iz Yettel aplikacije i uvezi ih ovde (može više odjednom). Troškić proverava svaki red prema stanju na
        izvodu, pa su brojevi tačni do dinara.
      </p>
      <Button label="Uvezi izvode" icon="pi pi-upload" :loading="uploading" @click="fileInput?.click()" />
    </section>

    <!-- ===================== Year view ===================== -->
    <template v-else-if="overview && selected === 'year'">
      <section class="hero">
        <p class="hero-label">
          {{ year }} · {{ overview.totals.months }}
          {{ plural(overview.totals.months, 'uvezen mesec', 'uvezena meseca', 'uvezenih meseci') }}
        </p>
        <p class="hero-amount" :class="{ negative: overview.totals.net < 0 }">
          {{ overview.totals.net >= 0 ? '+' : '−' }}{{ formatNumber(Math.abs(overview.totals.net), false) }}
          <span class="hero-currency">RSD</span>
        </p>
        <p class="hero-sub">
          ušteđeno<template v-if="overview.totals.savingsRate !== null">
            · {{ Math.round(overview.totals.savingsRate * 100) }}% priliva</template
          >
        </p>
        <div class="hero-tiles">
          <div class="tile">
            <p class="tile-label">Prilivi</p>
            <p class="tile-value" :title="`${formatNumber(overview.totals.inflows, false)} din`">{{ compact(overview.totals.inflows) }}</p>
          </div>
          <div class="tile">
            <p class="tile-label">Troškovi</p>
            <p class="tile-value" :title="`${formatNumber(overview.totals.spending, false)} din`">
              {{ compact(overview.totals.spending) }}
            </p>
          </div>
          <div v-if="overview.totals.transfersOut > 0" class="tile">
            <p class="tile-label">Na drugi račun</p>
            <p class="tile-value" :title="`${formatNumber(overview.totals.transfersOut, false)} din`">
              {{ compact(overview.totals.transfersOut) }}
            </p>
          </div>
        </div>
      </section>

      <section class="card">
        <h3 class="card-title">Ušteđeno po mesecima</h3>
        <p class="card-hint">Dodirni mesec za detaljan izveštaj.</p>
        <ReportYearChart :months="overview.months" :selected="null" @select="selectMonth" />
        <table class="month-table">
          <thead>
            <tr>
              <th scope="col">Mesec</th>
              <th scope="col">Prilivi</th>
              <th scope="col">Troškovi</th>
              <th scope="col">Ušteđeno</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="month in importedMonths" :key="month.period" @click="selectMonth(month.period)">
              <th scope="row">{{ MONTH_NAMES[month.month - 1] }}</th>
              <td>{{ formatNumber(month.summary!.inflows, false) }}</td>
              <td>{{ formatNumber(month.summary!.spending, false) }}</td>
              <td :class="month.summary!.net >= 0 ? 'pos' : 'neg'">
                {{ month.summary!.net >= 0 ? '+' : '−' }}{{ formatNumber(Math.abs(month.summary!.net), false) }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section">
        <h3 class="section-title">Predlozi</h3>
        <ReportInsightList :insights="overview.insights" :limit="5" />
      </section>

      <section class="card">
        <h3 class="card-title">Kuda idu pare u {{ year }}.</h3>
        <p class="card-hint">Ukupno u uvezenim mesecima i mesečni prosek.</p>
        <ReportCategoryBars :lines="overview.categories" mode="year" />
      </section>
    </template>

    <!-- ===================== Month view ===================== -->
    <template v-else-if="selected !== 'year'">
      <div v-if="loadingMonth && !report" class="loading"><i class="pi pi-spinner pi-spin"></i></div>
      <template v-else-if="report">
        <section class="hero">
          <p class="hero-label">
            {{ monthTitle }}<template v-if="report.summary.statementNo"> · izvod br. {{ report.summary.statementNo }}</template>
          </p>
          <p class="hero-amount" :class="{ negative: report.summary.net < 0 }">
            {{ report.summary.net >= 0 ? '+' : '−' }}{{ formatNumber(Math.abs(report.summary.net), false) }}
            <span class="hero-currency">RSD</span>
          </p>
          <p class="hero-sub">
            {{ report.summary.net >= 0 ? 'ušteđeno' : 'potrošeno više nego što je ušlo' }}
            <template v-if="report.summary.savingsRate !== null && report.summary.net >= 0">
              · {{ Math.round(report.summary.savingsRate * 100) }}% priliva</template
            >
          </p>
          <div class="hero-tiles">
            <div class="tile">
              <p class="tile-label">Prilivi</p>
              <p class="tile-value" :title="`${formatNumber(report.summary.inflows, false)} din`">{{ compact(report.summary.inflows) }}</p>
            </div>
            <div class="tile">
              <p class="tile-label">Troškovi</p>
              <p class="tile-value" :title="`${formatNumber(report.summary.spending, false)} din`">
                {{ compact(report.summary.spending) }}
              </p>
            </div>
            <div v-if="report.summary.transfersOut > 0" class="tile">
              <p class="tile-label">Na drugi račun</p>
              <p class="tile-value" :title="`${formatNumber(report.summary.transfersOut, false)} din`">
                {{ compact(report.summary.transfersOut) }}
              </p>
            </div>
          </div>
        </section>

        <section class="section">
          <h3 class="section-title">Predlozi</h3>
          <p v-if="report.comparedMonths === 0" class="card-hint">Poređenje sa prosekom stiže čim uvezeš još jedan mesec.</p>
          <ReportInsightList :insights="report.insights" />
        </section>

        <section class="card">
          <h3 class="card-title">Kuda idu pare</h3>
          <ReportGroupBar :groups="report.groups" />
        </section>

        <section class="card">
          <h3 class="card-title">Po kategorijama</h3>
          <p class="card-hint">Dodirni kategoriju za stavke. Pogrešnu kategoriju ispravi dodirom na stavku — Troškić pamti trgovca.</p>
          <ReportCategoryBars :lines="report.categories" mode="month" :selected="selectedCategory" @select="toggleCategory" />
        </section>

        <section v-if="selectedCategory" ref="detailPanel" class="card">
          <div class="card-head">
            <h3 class="card-title">{{ reportCategoryLabel(selectedCategory) }}</h3>
            <Button icon="pi pi-times" text rounded size="small" aria-label="Zatvori" @click="selectedCategory = null" />
          </div>
          <ReportTransactionList :transactions="categoryTransactions" @edit="editing = $event" />
        </section>

        <section class="card">
          <h3 class="card-title">Prilivi</h3>
          <ul class="simple-list">
            <li v-for="line in report.income" :key="line.category">
              <span class="row-icon"><i :class="reportCategoryIcon(line.category)"></i></span>
              <span class="row-label"
                >{{ line.label }}<small v-if="line.count > 1"> · {{ line.count }}×</small></span
              >
              <span class="row-value pos">+{{ formatNumber(line.amount, false) }}</span>
            </li>
          </ul>
        </section>

        <section class="card">
          <h3 class="card-title">Stanje računa</h3>
          <ul class="simple-list">
            <li v-for="account in report.accounts" :key="account.accountNo + account.currency">
              <span class="row-icon"><i :class="account.kind === 'savings' ? 'pi pi-database' : 'pi pi-credit-card'"></i></span>
              <span class="row-label">
                {{ account.label }}
                <small>
                  {{ formatNumber(account.openingBalance, false) }} → {{ formatNumber(account.closingBalance, false) }}
                  {{ account.currency }}
                  <template v-if="account.interestRate"> · kamata {{ account.interestRate }}%</template>
                </small>
              </span>
              <span class="row-value" :class="account.closingBalance >= account.openingBalance ? 'pos' : 'neg'">
                {{ account.closingBalance >= account.openingBalance ? '+' : '−'
                }}{{ formatNumber(Math.abs(account.closingBalance - account.openingBalance), false) }}
              </span>
            </li>
          </ul>
        </section>

        <section class="card">
          <h3 class="card-title">Najveći troškovi</h3>
          <p class="card-hint">Bez gotovine, po trgovcu.</p>
          <ul class="simple-list">
            <li v-for="line in report.topMerchants" :key="line.merchant">
              <span class="row-icon"><i :class="reportCategoryIcon(line.category)"></i></span>
              <span class="row-label"
                >{{ line.merchant
                }}<small
                  >{{ line.label }}<template v-if="line.count > 1"> · {{ line.count }}×</template></small
                ></span
              >
              <span class="row-value">{{ formatNumber(line.amount, false) }}</span>
            </li>
          </ul>
        </section>

        <section class="card">
          <div class="card-head">
            <h3 class="card-title">Sve transakcije</h3>
            <Button :label="showAll ? 'Sakrij' : `Prikaži (${report.transactions.length})`" text size="small" @click="showAll = !showAll" />
          </div>
          <template v-if="showAll">
            <div class="flow-filter">
              <button
                v-for="option in FLOW_FILTERS"
                :key="option.value"
                class="flow-chip"
                :class="{ active: flowFilter === option.value }"
                @click="flowFilter = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <ReportTransactionList :transactions="filteredTransactions" @edit="editing = $event" />
          </template>
        </section>

        <p class="footnote">
          Izvod je uvezen<template v-if="report.uploadedBy"> ({{ report.uploadedBy }})</template>. Evri su preračunati fiksnim kursom
          aplikacije. „Interni prenosi“ između tvojih Yettel računa se ne računaju ni kao prihod ni kao trošak.
        </p>
      </template>
    </template>

    <ReportCategoryDialog :transaction="editing" @close="editing = null" @saved="onCategorySaved" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import ReportCategoryBars from './reports/ReportCategoryBars.vue';
import ReportGroupBar from './reports/ReportGroupBar.vue';
import ReportInsightList from './reports/ReportInsightList.vue';
import ReportTransactionList from './reports/ReportTransactionList.vue';
import ReportYearChart from './reports/ReportYearChart.vue';
import ReportCategoryDialog from './reports/ReportCategoryDialog.vue';
import { reportsApi } from '@/api/reports';
import type { MonthReport, ReportTransaction, YearOverview } from '@/types/report';
import { MONTH_NAMES } from '@/constants/app';
import { reportCategoryIcon, reportCategoryLabel } from '@/constants/report-categories';
import { useAppToast } from '@/composables/useAppToast';
import { useTransactionFormatting } from '@/composables/useTransactionFormatting';
import { plural } from '@/utils/plural';

type FlowFilter = 'spending' | 'inflows' | 'transfers';
const FLOW_FILTERS: Array<{ value: FlowFilter; label: string }> = [
  { value: 'spending', label: 'Troškovi' },
  { value: 'inflows', label: 'Prilivi' },
  { value: 'transfers', label: 'Prenosi' }
];

const { formatNumber } = useTransactionFormatting();
const { showError, showSuccess } = useAppToast();

/** Hero tiles are narrow on a phone: millions as "1,06 mil." (full value in the title) */
function compact(value: number): string {
  if (Math.abs(value) < 1_000_000) return formatNumber(value, false);
  return `${(value / 1_000_000).toLocaleString('sr-RS', { maximumFractionDigits: 2 })} mil.`;
}

const currentYear = new Date().getFullYear();
const year = ref(currentYear);
const overview = ref<YearOverview | null>(null);
/** 'year' or an imported period (YYYY-MM) */
const selected = ref<string>('year');
const report = ref<MonthReport | null>(null);
const loadingOverview = ref(false);
const loadingMonth = ref(false);
const uploading = ref(false);
const selectedCategory = ref<string | null>(null);
const showAll = ref(false);
const flowFilter = ref<FlowFilter>('spending');
const editing = ref<ReportTransaction | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const detailPanel = ref<HTMLElement | null>(null);
const monthChips = ref<HTMLElement | null>(null);

const importedMonths = computed(() => overview.value?.months.filter(month => month.status === 'imported') ?? []);

const monthTitle = computed(() => {
  if (!report.value) return '';
  const [y, m] = report.value.summary.period.split('-');
  const name = MONTH_NAMES[Number(m) - 1] ?? '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
});

const categoryTransactions = computed(
  () => report.value?.transactions.filter(tx => tx.flow === 'expense' && tx.category === selectedCategory.value) ?? []
);

const filteredTransactions = computed(() => {
  const all = report.value?.transactions ?? [];
  if (flowFilter.value === 'spending') return all.filter(tx => tx.flow === 'expense');
  if (flowFilter.value === 'inflows')
    return all.filter(tx => tx.flow === 'income' || tx.flow === 'transfer_in' || tx.flow === 'cash_deposit');
  return all.filter(tx => tx.flow === 'internal' || tx.flow === 'transfer_out');
});

async function loadOverview(): Promise<void> {
  loadingOverview.value = true;
  try {
    overview.value = await reportsApi.year(year.value);
  } catch (error) {
    showError('Učitavanje izveštaja nije uspelo', error);
  } finally {
    loadingOverview.value = false;
  }
}

async function loadMonth(period: string): Promise<void> {
  loadingMonth.value = true;
  try {
    report.value = await reportsApi.month(period);
  } catch (error) {
    showError('Učitavanje meseca nije uspelo', error);
  } finally {
    loadingMonth.value = false;
  }
}

async function selectMonth(period: string): Promise<void> {
  if (selected.value !== period) {
    selectedCategory.value = null;
    showAll.value = false;
    report.value = null;
  }
  selected.value = period;
  await nextTick();
  monthChips.value?.querySelector('.month-chip.active')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  await loadMonth(period);
}

function selectYear(): void {
  selected.value = 'year';
  report.value = null;
}

/** Opens the latest imported month, or the year view when nothing is imported */
async function openLatest(): Promise<void> {
  if (overview.value?.latestPeriod) await selectMonth(overview.value.latestPeriod);
  else selectYear();
}

async function changeYear(delta: number): Promise<void> {
  year.value += delta;
  selectYear();
  await loadOverview();
  await openLatest();
}

async function toggleCategory(category: string): Promise<void> {
  selectedCategory.value = selectedCategory.value === category ? null : category;
  if (selectedCategory.value) {
    await nextTick();
    detailPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function onFilesChosen(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = '';
  if (files.length === 0) return;

  uploading.value = true;
  let lastPeriod: string | null = null;
  for (const file of files) {
    try {
      const result = await reportsApi.uploadStatement(file);
      lastPeriod = result.period;
      const [y, m] = result.period.split('-');
      showSuccess(
        `${MONTH_NAMES[Number(m) - 1]} ${y}: ${result.transactions} ${plural(result.transactions, 'stavka', 'stavke', 'stavki')}${result.replaced ? ' (zamenjen raniji uvoz)' : ''}`,
        'Izvod uvezen'
      );
    } catch (error) {
      showError(`${file.name}: uvoz nije uspeo`, error);
    }
  }
  uploading.value = false;

  if (lastPeriod) {
    year.value = Number(lastPeriod.slice(0, 4));
    await loadOverview();
    await selectMonth(lastPeriod);
  }
}

async function onCategorySaved(): Promise<void> {
  editing.value = null;
  await Promise.all([loadOverview(), selected.value !== 'year' ? loadMonth(selected.value) : Promise.resolve()]);
}

onMounted(async () => {
  await loadOverview();
  await openLatest();
});
</script>

<style scoped>
.reports-view {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 0.75rem 1.25rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reports-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.reports-head .page-subtitle {
  margin-bottom: 0;
  font-size: 0.875rem;
}

.upload-btn {
  flex-shrink: 0;
}

/* ---------- Period picker ---------- */
.period-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.year-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.year-label {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 3.5rem;
  text-align: center;
}

.month-chips {
  display: flex;
  gap: 0.375rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  scrollbar-width: none;
}

.month-chips::-webkit-scrollbar {
  display: none;
}

.month-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--surface-card);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.month-chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #ffffff;
}

:global(:root.dark-mode) .month-chip.active {
  color: #131316;
}

.month-chip.missing {
  color: var(--text-secondary);
  background: transparent;
  border-style: dashed;
  cursor: default;
}

.month-chip.missing i {
  font-size: 0.7rem;
  color: var(--expense-color);
}

.month-chip.upcoming {
  color: var(--text-secondary);
  background: transparent;
  opacity: 0.55;
  cursor: default;
}

/* ---------- Hero ---------- */
.hero {
  background: var(--hero-bg);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}

.hero-label {
  margin: 0 0 0.25rem;
  font-size: 0.8125rem;
  color: var(--hero-muted);
}

.hero-amount {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--hero-text);
}

.hero-amount.negative {
  color: #f79c86;
}

.hero-currency {
  font-size: 1rem;
  font-weight: 600;
  color: var(--hero-muted);
}

.hero-sub {
  margin: 0.125rem 0 0;
  font-size: 0.875rem;
  color: var(--hero-muted);
}

.hero-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 1rem;
}

.tile {
  background: var(--hero-chip);
  border-radius: var(--radius-sm);
  padding: 0.625rem 0.75rem;
  min-width: 0;
}

.tile-label {
  margin: 0;
  font-size: 0.75rem;
  color: var(--hero-muted);
}

.tile-value {
  margin: 0.125rem 0 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--hero-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---------- Cards ---------- */
.card {
  background: var(--surface-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 1rem;
  scroll-margin-top: 120px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-title,
.section-title {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
  color: var(--text-primary);
}

.section-title {
  margin-bottom: 0.5rem;
}

.card-hint {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.simple-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.simple-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.simple-list li:last-child {
  border-bottom: none;
}

.row-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-hover);
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.row-label {
  flex: 1;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.row-label small {
  display: block;
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.row-value {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pos {
  color: var(--income-color);
}

.neg {
  color: var(--expense-color);
}

/* ---------- Year table (also the accessible view of the chart) ---------- */
.month-table {
  width: 100%;
  margin-top: 1rem;
  border-collapse: collapse;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.month-table th,
.month-table td {
  padding: 0.5rem 0.25rem;
  text-align: right;
  border-bottom: 1px solid var(--border-color);
}

.month-table thead th {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.month-table th:first-child {
  text-align: left;
  text-transform: capitalize;
}

.month-table tbody tr {
  cursor: pointer;
}

.month-table tbody tr:hover {
  background: var(--surface-hover);
}

.month-table td {
  color: var(--text-primary);
}

.month-table td.pos {
  color: var(--income-color);
  font-weight: 700;
}

.month-table td.neg {
  color: var(--expense-color);
  font-weight: 700;
}

/* ---------- Transactions filter ---------- */
.flow-filter {
  display: flex;
  gap: 0.375rem;
  margin: 0.5rem 0;
}

.flow-chip {
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: transparent;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.flow-chip.active {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--primary-light);
}

/* ---------- Misc ---------- */
.loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
  font-size: 1.75rem;
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  background: var(--surface-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.empty-state h3 {
  margin: 0.75rem 0 0.5rem;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0 auto 1.25rem;
  max-width: 28rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 2.25rem;
  color: var(--primary-color);
}

.footnote {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

@media (max-width: 480px) {
  .reports-head {
    flex-direction: column;
  }

  .upload-btn {
    width: 100%;
  }

  .hero-amount {
    font-size: 1.875rem;
  }
}
</style>
