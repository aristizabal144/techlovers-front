<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ExpenseDrawer from './components/ExpenseDrawer.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import { $api } from '@/utils/api'

definePage({
  name: 'ExpensesList',
})

// Data tables
const searchQuery = ref('')
const totalData = ref(0)

interface ExpenseItem {
  id: number
  fecha: string
  descripcion: string
  valor: number
  metodo_pago: string
  [key: string]: any
}

const tableData = ref<ExpenseItem[]>([])
const isLoading = ref(false)

// Pagination
const options = ref({ page: 1, itemsPerPage: 50, sortBy: [], groupBy: [], search: undefined })
const itemsPerPageOptions = [50, 100, 150, 200, 500]

// Date filters
const filterFrom = ref('')
const filterTo = ref('')
const isDateFilterActive = ref(false)

// Headers
const headers = [
  { title: 'Fecha', key: 'fecha', width: '130px' },
  { title: 'Descripción', key: 'descripcion' },
  { title: 'Valor', key: 'valor', width: '140px' },
  { title: 'Método de Pago', key: 'metodo_pago', width: '170px' },
  { title: 'Acciones', key: 'actions', sortable: false, width: '100px', align: 'center' as const },
]

// Drawer logic
interface ExpenseData {
  fecha: string
  valor: number | null
  metodo_pago: string
  descripcion: string
}
const isDrawerOpen = ref(false)
const isSubmitting = ref(false)
const editingExpenseId = ref<number | null>(null)
const editingData = ref<ExpenseData>({ fecha: '', valor: null, metodo_pago: '', descripcion: '' })

// Confirm dialog
const confirmDialog = ref<InstanceType<typeof AppConfirmDialog> | null>(null)
const itemToDelete = ref<number | null>(null)

// Snackbar
const isSnackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('error')

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const fetchExpenses = async () => {
  isLoading.value = true
  try {
    const params: any = {
      size: options.value.itemsPerPage,
      page: options.value.page,
    }

    let endpoint = '/gastos'

    // If date filters are active, use the date endpoint
    if (isDateFilterActive.value && (filterFrom.value || filterTo.value)) {
      endpoint = '/gastos-date'
      if (filterFrom.value) params.from = filterFrom.value
      if (filterTo.value) params.to = filterTo.value
    }

    const response = await $api<any>(endpoint, { params })

    if (response.is_error) {
      tableData.value = []
      snackbarMessage.value = response.message || 'Error al cargar gastos'
      snackbarColor.value = 'error'
      isSnackbarVisible.value = true
      return
    }

    tableData.value = response.data?.data || []
    options.value.itemsPerPage = response.data?.per_page || 50
    totalData.value = response.data?.total || 0
  } catch (error: any) {
    console.error(error)
    snackbarMessage.value = error.response?._data?.message || error.data?.message || 'Error de conexión'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isLoading.value = false
  }
}

const onSearchByDate = () => {
  isDateFilterActive.value = true
  options.value.page = 1
  fetchExpenses()
}

const clearDateFilter = () => {
  filterFrom.value = ''
  filterTo.value = ''
  isDateFilterActive.value = false
  options.value.page = 1
  fetchExpenses()
}

// Actions
const openAddDrawer = () => {
  editingExpenseId.value = null
  editingData.value = { fecha: '', valor: null, metodo_pago: '', descripcion: '' }
  isDrawerOpen.value = true
}

const editExpense = (item: ExpenseItem) => {
  editingExpenseId.value = item.id
  editingData.value = {
    fecha: item.fecha || '',
    valor: item.valor || null,
    metodo_pago: item.metodo_pago || '',
    descripcion: item.descripcion || '',
  }
  isDrawerOpen.value = true
}

const confirmDeleteExpense = (id: number) => {
  itemToDelete.value = id
  confirmDialog.value?.open()
}

const executeDeleteExpense = async () => {
  if (!itemToDelete.value) return

  try {
    const response = await $api<any>(`/gastos/${itemToDelete.value}`, { method: 'DELETE' })
    if (response.is_error) {
      snackbarMessage.value = response.message || 'Error al eliminar gasto'
      snackbarColor.value = 'error'
      isSnackbarVisible.value = true
      return
    }

    fetchExpenses()
    snackbarMessage.value = 'Gasto eliminado exitosamente'
    snackbarColor.value = 'success'
    isSnackbarVisible.value = true
  } catch (error: any) {
    console.error('Error deleting expense', error)
    snackbarMessage.value = error.response?._data?.message || error.data?.message || 'Error de conexión al eliminar'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    itemToDelete.value = null
  }
}

const onDrawerSubmit = async (data: any, id?: number | null) => {
  isSubmitting.value = true

  try {
    let response: any

    if (id) {
      response = await $api(`/gastos/${id}`, { method: 'PUT', body: data })
    } else {
      response = await $api('/gastos', { method: 'POST', body: data })
    }

    if (response.is_error) {
      snackbarMessage.value = response.message || 'Error al guardar el gasto'
      snackbarColor.value = 'error'
      isSnackbarVisible.value = true
      return
    }

    isDrawerOpen.value = false
    fetchExpenses()
    snackbarMessage.value = id ? 'Gasto actualizado exitosamente' : 'Gasto creado exitosamente'
    snackbarColor.value = 'success'
    isSnackbarVisible.value = true
  } catch (error: any) {
    console.error('Error saving expense', error)
    snackbarMessage.value = error.response?._data?.message || error.data?.message || 'Error de conexión al guardar'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isSubmitting.value = false
  }
}

// Watchers
watch([() => options.value.page, () => options.value.itemsPerPage], () => {
  fetchExpenses()
})

onMounted(() => {
  fetchExpenses()
})
</script>

<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-5 pb-2">
      <div>
        <h5 class="text-h5 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-coin" color="primary" size="28" />
          Gestión de Gastos
        </h5>
        <p class="text-body-2 text-medium-emphasis mb-0 mt-1">
          Control y registro de gastos de la empresa
        </p>
      </div>
    </VCardTitle>

    <VCardText class="d-flex flex-wrap gap-4 align-center justify-space-between pb-4">
      <!-- Date Filters -->
      <div class="d-flex align-center flex-wrap gap-4 flex-grow-1">
        <div style="width: 170px;">
          <VTextField
            v-model="filterFrom"
            label="Desde"
            type="date"
            density="compact"
            hide-details
            prepend-inner-icon="tabler-calendar"
          />
        </div>
        <div style="width: 170px;">
          <VTextField
            v-model="filterTo"
            label="Hasta"
            type="date"
            density="compact"
            hide-details
            prepend-inner-icon="tabler-calendar"
          />
        </div>
        <VBtn
          color="primary"
          variant="tonal"
          prepend-icon="tabler-filter"
          @click="onSearchByDate"
        >
          Filtrar
        </VBtn>
        <VBtn
          v-if="isDateFilterActive"
          color="secondary"
          variant="text"
          prepend-icon="tabler-filter-off"
          size="small"
          @click="clearDateFilter"
        >
          Limpiar
        </VBtn>
      </div>

      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        @click="openAddDrawer"
      >
        Crear Gasto
      </VBtn>
    </VCardText>

    <VDivider />

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="tableData"
      :items-length="totalData"
      :loading="isLoading"
      :items-per-page-options="itemsPerPageOptions"
      class="text-body-2 text-no-wrap"
      density="compact"
      @update:options="options = $event"
    >
      <!-- Fecha -->
      <template #item.fecha="{ item }">
        <span class="font-weight-medium">{{ item.fecha }}</span>
      </template>

      <!-- Descripción -->
      <template #item.descripcion="{ item }">
        <div style="min-width: 200px; white-space: normal;">
          <span class="text-body-2">{{ item.descripcion?.toUpperCase() }}</span>
        </div>
      </template>

      <!-- Valor -->
      <template #item.valor="{ item }">
        <span class="font-weight-bold text-error">{{ formatCurrency(item.valor) }}</span>
      </template>

      <!-- Método de Pago -->
      <template #item.metodo_pago="{ item }">
        <VChip
          :color="item.metodo_pago === 'efectivo' ? 'success' : 'info'"
          size="small"
          variant="tonal"
        >
          {{ item.metodo_pago === 'efectivo' ? '🤑' : '💳' }}
          {{ item.metodo_pago?.toUpperCase() }}
        </VChip>
      </template>

      <!-- Acciones -->
      <template #item.actions="{ item }">
        <div class="d-flex gap-1">
          <IconBtn @click="editExpense(item)">
            <VIcon icon="tabler-pencil" />
          </IconBtn>
          <IconBtn @click="confirmDeleteExpense(item.id)">
            <VIcon icon="tabler-trash" color="error" />
          </IconBtn>
        </div>
      </template>

      <!-- Empty state -->
      <template #no-data>
        <div class="text-center text-body-1 py-4">
          No hay gastos registrados
        </div>
      </template>
    </VDataTableServer>
  </VCard>

  <!-- Drawer -->
  <ExpenseDrawer
    v-model:is-drawer-open="isDrawerOpen"
    :editing-expense-id="editingExpenseId"
    :initial-data="editingData"
    :is-submitting="isSubmitting"
    @submit="onDrawerSubmit"
  />

  <AppConfirmDialog
    ref="confirmDialog"
    title="¿Eliminar Gasto?"
    message="¡Esta acción no se puede deshacer! ¿Estás completamente seguro de eliminar este gasto?"
    @confirm="executeDeleteExpense"
  />

  <!-- Snackbar -->
  <VSnackbar
    v-model="isSnackbarVisible"
    :color="snackbarColor"
    location="top end"
    :timeout="3000"
  >
    {{ snackbarMessage }}
    
    <template #actions>
      <VBtn
        color="white"
        variant="text"
        icon="tabler-x"
        @click="isSnackbarVisible = false"
      />
    </template>
  </VSnackbar>
</template>
