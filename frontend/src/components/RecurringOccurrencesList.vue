<template>
  <div class="recurring-occurrences-page">
    <div class="page-header">
      <h2 class="page-title">Ponavljajuće stavke</h2>
      <p class="page-subtitle">Upravljajte ponavljajućim prihodima i troškovima</p>
    </div>

    <div class="occurrences-container">
      <DataTable :value="occurrences" :loading="loading" responsive-layout="scroll" class="occurrences-table" striped-rows>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-replay empty-icon"></i>
            <p>Nemate ponavljajućih stavki</p>
            <small>Dodajte ponavljajuću stavku iz forme za prihode ili troškove</small>
          </div>
        </template>

        <Column field="occurrenceType" header="Tip" style="min-width: 100px">
          <template #body="{ data }">
            <Tag
              :value="data.occurrenceType === 'income' ? 'Prihod' : 'Trošak'"
              :severity="data.occurrenceType === 'income' ? 'success' : 'danger'"
              :icon="data.occurrenceType === 'income' ? 'pi pi-wallet' : 'pi pi-shopping-cart'"
            />
          </template>
        </Column>

        <Column header="Opis" style="min-width: 150px">
          <template #body="{ data }">
            <strong>{{ getDescription(data) }}</strong>
            <small v-if="data.description" class="description-text"> <br />{{ data.description }} </small>
          </template>
        </Column>

        <Column field="amount" header="Iznos" style="min-width: 120px">
          <template #body="{ data }">
            <span class="amount-text"> {{ Math.round(data.amount).toLocaleString('sr-RS') }} {{ data.originalCurrency }} </span>
          </template>
        </Column>

        <Column field="frequency" header="Učestalost" style="min-width: 120px">
          <template #body="{ data }">
            {{ recurringFrequencyLabels[data.frequency as RecurringFrequency] }}
          </template>
        </Column>

        <Column field="nextOccurrenceDate" header="Sledeća pojava" style="min-width: 150px">
          <template #body="{ data }">
            {{ formatDate(data.nextOccurrenceDate) }}
          </template>
        </Column>

        <Column field="isActive" header="Status" style="min-width: 100px">
          <template #body="{ data }">
            <Tag :value="data.isActive ? 'Aktivan' : 'Neaktivan'" :severity="data.isActive ? 'success' : 'secondary'" />
          </template>
        </Column>

        <Column header="Akcije" style="min-width: 120px">
          <template #body="{ data }">
            <Button icon="pi pi-trash" severity="danger" text rounded :loading="deletingId === data.id" @click="confirmDelete(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import apiClient from '@/api/client';
import { recurringFrequencyLabels, type RecurringOccurrence, type RecurringFrequency } from '@/types/recurring-occurrence';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';

const userStore = useUserStore();
const toast = useToast();
const confirm = useConfirm();
const occurrences = ref<RecurringOccurrence[]>([]);
const loading = ref(false);
const deletingId = ref<string | null>(null);

async function fetchOccurrences() {
  loading.value = true;
  try {
    const userId = userStore.selectedUser === 'svetla' ? 'Svetla' : 'Dejan';
    const response = await apiClient.get(`/recurring-occurrences?userId=${userId}`);
    occurrences.value = response.data;
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Greška',
      detail: 'Nije moguće učitati ponavljajuće stavke',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
}

function getDescription(occurrence: RecurringOccurrence): string {
  if (occurrence.occurrenceType === 'income') {
    return occurrence.source || 'Prihod';
  } else {
    return occurrence.store || occurrence.expenseCategory || 'Trošak';
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function confirmDelete(occurrence: RecurringOccurrence) {
  confirm.require({
    message: `Da li ste sigurni da želite da obrišete ponavljajuću stavku "${getDescription(occurrence)}"?`,
    header: 'Potvrda brisanja',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Obriši',
    rejectLabel: 'Otkaži',
    accept: () => deleteOccurrence(occurrence.id)
  });
}

async function deleteOccurrence(id: string) {
  deletingId.value = id;
  try {
    await apiClient.delete(`/recurring-occurrences/${id}`);
    toast.add({
      severity: 'success',
      summary: 'Uspeh',
      detail: 'Ponavljajuća stavka je obrisana',
      life: 3000
    });
    await fetchOccurrences();
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Greška',
      detail: 'Nije moguće obrisati ponavljajuću stavku',
      life: 3000
    });
  } finally {
    deletingId.value = null;
  }
}

onMounted(() => {
  fetchOccurrences();
});
</script>

<style scoped>
.recurring-occurrences-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}

.occurrences-container {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.occurrences-table {
  width: 100%;
}

.description-text {
  color: #6b7280;
  font-size: 0.875rem;
}

.amount-text {
  font-weight: 600;
  font-size: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  color: #d1d5db;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #374151;
}

.empty-state small {
  font-size: 0.875rem;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .recurring-occurrences-page {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .page-subtitle {
    font-size: 0.875rem;
  }

  .occurrences-container {
    border-radius: 0.75rem;
  }
}
</style>
