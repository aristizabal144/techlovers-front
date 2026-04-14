<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import ValeDrawer from './components/ValeDrawer.vue'
import PayValeDialog from './components/PayValeDialog.vue'
import AbonoDialog from './components/AbonoDialog.vue'
import AbonosViewDialog from './components/AbonosViewDialog.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import { $api } from '@/utils/api'

definePage({
  name: 'TicketsList',
})

// Data table
const totalData = ref(0)

interface ValeItem {
  id: number
  fecha: string
  valor: number
  faltante_pago: number
  estado: string
  encargado: { name: string; id: number }
  [key: string]: any
}

interface UserOption {
  id: number
  name: string
}

const tableData = ref<ValeItem[]>([])
const isLoading = ref(false)

// Pagination
const options = ref({ page: 1, itemsPerPage: 50, sortBy: [], groupBy: [], search: undefined })
const itemsPerPageOptions = [50, 100, 150, 200, 500]

// User filter
const listUsers = ref<UserOption[]>([])
const userSelect = ref<number | null>(null)

// Headers
const headers = [
  { title: 'Fecha', key: 'fecha', width: '120px' },
  { title: 'Valor', key: 'valor', width: '130px' },
  { title: 'Pago Faltante', key: 'faltante_pago', width: '140px' },
  { title: 'Responsable', key: 'encargado', width: '160px' },
  { title: 'Estado', key: 'estado', width: '180px' },
  { title: 'Acciones', key: 'actions', sortable: false, width: '150px', align: 'center' as const },
]

// Drawer
const isDrawerOpen = ref(false)
const isSubmitting = ref(false)

// Dialogs
const showPayDialog = ref(false)
const showAbonoDialog = ref(false)
const showAbonosViewDialog = ref(false)
const selectedTicketId = ref<number | null>(null)
const selectedTicketData = ref<ValeItem | null>(null)

// Confirm delete dialog
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

// Fetch users for filter & drawer
const fetchUsers = async () => {
  try {
    const response = await $api<any>('/user')
    listUsers.value = response.data || []
  } catch (error) {
    console.error('Error fetching users:', error)
  }
}

// Fetch vales
const fetchVales = async () => {
  isLoading.value = true
  try {
    let endpoint = '/vales'
    const params: any = {
      size: options.value.itemsPerPage,
      page: options.value.page,
    }

    // If user filter is active, use user-search endpoint
    if (userSelect.value) {
      endpoint = '/vales/user-search'
      params.id = userSelect.value
    }

    const response = await $api<any>(endpoint, { params })

    if (response.is_error) {
      tableData.value = []
      snackbarMessage.value = response.message || 'Error al cargar vales'
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

const onUserFilterChange = () => {
  options.value.page = 1
  fetchVales()
}

const clearUserFilter = () => {
  userSelect.value = null
  options.value.page = 1
  fetchVales()
}

// Actions
const openAddDrawer = () => {
  isDrawerOpen.value = true
}

const openPayDialog = (item: ValeItem) => {
  selectedTicketId.value = item.id
  selectedTicketData.value = item
  showPayDialog.value = true
}

const openAbonoDialog = (item: ValeItem) => {
  selectedTicketId.value = item.id
  selectedTicketData.value = item
  showAbonoDialog.value = true
}

const openAbonosView = (item: ValeItem) => {
  selectedTicketId.value = item.id
  selectedTicketData.value = item
  showAbonosViewDialog.value = true
}

const confirmDeleteVale = (id: number) => {
  itemToDelete.value = id
  confirmDialog.value?.open()
}

const executeDeleteVale = async () => {
  if (!itemToDelete.value) return

  try {
    const response = await $api<any>(`/vales/${itemToDelete.value}`, { method: 'DELETE' })
    if (response.is_error) {
      snackbarMessage.value = response.message || 'Error al eliminar vale'
      snackbarColor.value = 'error'
      isSnackbarVisible.value = true
      return
    }

    fetchVales()
    snackbarMessage.value = 'Vale eliminado exitosamente'
    snackbarColor.value = 'success'
    isSnackbarVisible.value = true
  } catch (error: any) {
    console.error('Error deleting vale', error)
    snackbarMessage.value = error.response?._data?.message || error.data?.message || 'Error de conexión al eliminar'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    itemToDelete.value = null
  }
}

const onDrawerSubmit = async (data: any) => {
  isSubmitting.value = true

  // Ensure proper types matching the old implementation
  const payload = {
    fecha: data.fecha,
    valor: Number(data.valor),
    id_usuario: Number(data.id_usuario),
  }

  try {
    const response = await $api<any>('/vales', { method: 'POST', body: payload })

    if (response.is_error) {
      snackbarMessage.value = response.message || 'Error al crear el vale'
      snackbarColor.value = 'error'
      isSnackbarVisible.value = true
      return
    }

    isDrawerOpen.value = false
    fetchVales()
    snackbarMessage.value = 'Vale creado exitosamente'
    snackbarColor.value = 'success'
    isSnackbarVisible.value = true
  } catch (error: any) {
    console.error('Error creating vale', error)
    snackbarMessage.value = error.response?._data?.message || error.data?.message || 'Error de conexión al guardar'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isSubmitting.value = false
  }
}

const onValePaid = () => {
  fetchVales()
  snackbarMessage.value = 'Vale pagado exitosamente'
  snackbarColor.value = 'success'
  isSnackbarVisible.value = true
}

const onAbonoSaved = () => {
  fetchVales()
  snackbarMessage.value = 'Abono registrado exitosamente'
  snackbarColor.value = 'success'
  isSnackbarVisible.value = true
}

// Watchers
watch([() => options.value.page, () => options.value.itemsPerPage], () => {
  fetchVales()
})

onMounted(() => {
  fetchUsers()
  fetchVales()
})
</script>

<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-5 pb-2">
      <div>
        <h5 class="text-h5 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-receipt-2" color="primary" size="28" />
          Gestión de Vales
        </h5>
        <p class="text-body-2 text-medium-emphasis mb-0 mt-1">
          Administración de vales y abonos
        </p>
      </div>
    </VCardTitle>

    <VCardText class="d-flex flex-wrap gap-4 align-center justify-space-between pb-4">
      <!-- User filter -->
      <div class="d-flex align-center flex-wrap gap-4 flex-grow-1">
        <div style="width: 280px;">
          <VSelect
            v-model="userSelect"
            :items="listUsers"
            item-title="name"
            item-value="id"
            placeholder="Filtrar por usuario..."
            clearable
            density="compact"
            hide-details
            prepend-inner-icon="tabler-user-search"
            @update:model-value="onUserFilterChange"
          />
        </div>
        <VBtn
          v-if="userSelect"
          color="secondary"
          variant="text"
          prepend-icon="tabler-filter-off"
          size="small"
          @click="clearUserFilter"
        >
          Limpiar
        </VBtn>
      </div>

      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        @click="openAddDrawer"
      >
        Crear Vale
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

      <!-- Valor -->
      <template #item.valor="{ item }">
        <span class="font-weight-bold text-error">{{ formatCurrency(item.valor) }}</span>
      </template>

      <!-- Pago Faltante -->
      <template #item.faltante_pago="{ item }">
        <span class="font-weight-bold text-warning">{{ formatCurrency(item.faltante_pago) }}</span>
      </template>

      <!-- Responsable -->
      <template #item.encargado="{ item }">
        <div class="d-flex align-center gap-2">
          <VAvatar size="28" color="primary" variant="tonal">
            <span class="text-caption font-weight-bold">{{ item.encargado?.name?.charAt(0)?.toUpperCase() }}</span>
          </VAvatar>
          <span class="text-body-2">{{ item.encargado?.name }}</span>
        </div>
      </template>

      <!-- Estado -->
      <template #item.estado="{ item }">
        <VMenu v-if="item.estado === 'pendiente'" location="bottom">
          <template #activator="{ props: menuProps }">
            <VChip
              v-bind="menuProps"
              color="warning"
              size="small"
              variant="elevated"
              append-icon="tabler-chevron-down"
              class="cursor-pointer w-100 justify-center"
            >
              Pendiente de pago
            </VChip>
          </template>
          <VList density="compact">
            <VListItem @click="openPayDialog(item)">
              <template #prepend>
                <VIcon icon="tabler-cash" color="success" size="20" />
              </template>
              <VListItemTitle>Pagar</VListItemTitle>
            </VListItem>
            <VListItem @click="openAbonoDialog(item)">
              <template #prepend>
                <VIcon icon="tabler-coin" color="primary" size="20" />
              </template>
              <VListItemTitle>Abonar</VListItemTitle>
            </VListItem>
          </VList>
        </VMenu>
        <VChip
          v-else
          color="success"
          size="small"
          variant="elevated"
          class="w-100 justify-center"
        >
          PAGADO
        </VChip>
      </template>

      <!-- Acciones -->
      <template #item.actions="{ item }">
        <div class="d-flex gap-1">
          <IconBtn @click="openAbonosView(item)">
            <VIcon icon="tabler-eye" />
            <VTooltip activator="parent" location="top">Ver abonos</VTooltip>
          </IconBtn>
          <IconBtn @click="confirmDeleteVale(item.id)">
            <VIcon icon="tabler-trash" color="error" />
            <VTooltip activator="parent" location="top">Eliminar</VTooltip>
          </IconBtn>
        </div>
      </template>

      <!-- Empty state -->
      <template #no-data>
        <div class="text-center text-body-1 py-4">
          No hay vales registrados
        </div>
      </template>
    </VDataTableServer>
  </VCard>

  <!-- Vale Drawer (Create) -->
  <ValeDrawer
    v-model:is-drawer-open="isDrawerOpen"
    :is-submitting="isSubmitting"
    :users="listUsers"
    @submit="onDrawerSubmit"
  />

  <!-- Pay Full Dialog -->
  <PayValeDialog
    v-model="showPayDialog"
    :ticket-id="selectedTicketId"
    :ticket-data="selectedTicketData"
    @paid="onValePaid"
  />

  <!-- Abono Dialog -->
  <AbonoDialog
    v-model="showAbonoDialog"
    :ticket-id="selectedTicketId"
    @saved="onAbonoSaved"
  />

  <!-- Abonos View Dialog -->
  <AbonosViewDialog
    v-model="showAbonosViewDialog"
    :ticket-id="selectedTicketId"
    :ticket-data="selectedTicketData"
  />

  <AppConfirmDialog
    ref="confirmDialog"
    title="¿Eliminar Vale?"
    message="¡Esta acción no se puede deshacer! ¿Estás completamente seguro de eliminar este vale?"
    @confirm="executeDeleteVale"
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
