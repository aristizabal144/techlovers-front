<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { $api } from '@/utils/api'
import ClientDrawer from './components/ClientDrawer.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'

definePage({
  name: 'CustomerList',
})

// Options that drive VDataTableServer & VPagination
const options = ref({
  page: 1,
  itemsPerPage: 50,
  sortBy: [],
  groupBy: [],
  search: undefined,
})

const itemsPerPageOptions = [50, 100, 150, 200, 500]
const searchQuery = ref('')

// State variables
const isLoading = ref(false)
const totalClients = ref(0)
const clientsList = ref<any[]>([])
const isDrawerOpen = ref(false)

// Edit mode states to pass to Drawer
const isEditing = ref(false)
const editingData = ref<any>(null)

// Dialogs
const confirmDialog = ref<InstanceType<typeof AppConfirmDialog> | null>(null)
const itemToDelete = ref<string | number | null>(null)

// Snackbars
const isSnackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// Table Headers
const headers = [
  { title: 'Cliente', key: 'cliente' },
  { title: 'NIT / ID', key: 'identificacion', width: '130px' },
  { title: 'Celular', key: 'celular', width: '130px' },
  { title: 'Teléfono', key: 'telefono_fijo', width: '130px' },
  { title: 'Acciones', key: 'actions', sortable: false, width: '100px', align: 'center' as const },
]

// Avatar Helpers
const getInitials = (name: string) => {
  if (!name) return 'NA'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/**
 * Main Fetch Data function connecting to GET /client or /client/client-search
 */
const fetchClients = async () => {
  isLoading.value = true
  try {
    let endpoint = '/client'
    let params: any = {
      size: options.value.itemsPerPage,
      page: options.value.page
    }

    if (searchQuery.value) {
      endpoint = '/client/client-search'
      params.input = searchQuery.value
    }

    const response = await $api<any>(endpoint, { params })

    if (response.is_error) {
       clientsList.value = []
       totalClients.value = 0
       return
    }

    // Adapt to Laravel nested data structure depending on search vs regular query
    if (searchQuery.value) {
      clientsList.value = response.data || []
      options.value.itemsPerPage = response.per_page || 50
      totalClients.value = response.total || clientsList.value.length
    } else {
      clientsList.value = response.data?.data || []
      options.value.itemsPerPage = response.data?.per_page || 50
      totalClients.value = response.data?.total || clientsList.value.length
    }

  } catch (error: any) {
    console.error('Error fetching clients:', error)
    snackbarMessage.value = error.response?._data?.message || 'Error de conexión'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle debounced or pressed Enter on search
 */
const onSearch = () => {
  options.value.page = 1
  fetchClients()
}

/**
 * Open Drawer to CREATE a new Client
 */
const openCreateMode = () => {
  isEditing.value = false
  editingData.value = null
  isDrawerOpen.value = true
}

/**
 * Open Drawer to EDIT an existing Client
 */
const openEditMode = (client: any) => {
  isEditing.value = true
  editingData.value = { ...client }
  isDrawerOpen.value = true
}

/**
 * Handle Delete
 */
const confirmDeleteClient = (id: string | number) => {
  itemToDelete.value = id
  confirmDialog.value?.open()
}

const executeDeleteClient = async () => {
  if (!itemToDelete.value) return
  
  isLoading.value = true
  try {
    const response = await $api<any>(`/client/${itemToDelete.value}`, { method: 'DELETE' })
    
    if (response && response.is_error) {
       snackbarMessage.value = response.message || 'Error al eliminar el cliente'
       snackbarColor.value = 'error'
       isSnackbarVisible.value = true
       return
    } 
    
    snackbarMessage.value = 'Cliente eliminado exitosamente'
    snackbarColor.value = 'success'
    isSnackbarVisible.value = true
    await fetchClients()
    
  } catch (error: any) {
    console.error('Error deleting client', error)
    
    const errorData = error.response?._data || error.data || {}
    snackbarMessage.value = errorData.message || error.message || 'Error de conexión'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isLoading.value = false
    itemToDelete.value = null
  }
}

watch([() => options.value.page, () => options.value.itemsPerPage], () => {
  fetchClients()
})

onMounted(() => {
  fetchClients()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <!-- MAIN CRM CARD -->
      <VCard>
        <VCardTitle class="d-flex align-center pa-5 pb-2">
          <div>
            <h5 class="text-h5 font-weight-bold d-flex align-center gap-2">
              <VIcon icon="tabler-users" color="primary" size="28" />
              Directorio de Clientes
            </h5>
            <p class="text-body-2 text-medium-emphasis mb-0 mt-1">
              Gestión de clientes y contactos comerciales
            </p>
          </div>
        </VCardTitle>
        
        <!-- CARD HEADER / TOOLBAR -->
        <VCardText class="d-flex flex-wrap gap-4 align-center justify-space-between pb-6">
          <div class="d-flex align-center flex-wrap gap-4 flex-grow-1">
            <div style="width: 250px;">
              <VTextField
                v-model="searchQuery"
                placeholder="Buscar nombre o NIT..."
                density="compact"
                hide-details
                prepend-inner-icon="tabler-search"
                @keyup.enter="onSearch"
              />
            </div>
            <VBtn
              color="primary"
              @click="onSearch"
            >
              Buscar
            </VBtn>
          </div>
          
          <div class="d-flex align-center gap-4">
            <VBtn
              color="primary"
              prepend-icon="tabler-plus"
              @click="openCreateMode"
              class="elevation-2 font-weight-bold"
            >
              Nuevo Cliente
            </VBtn>
          </div>
        </VCardText>

        <VDivider />

        <!-- DATA TABLE -->
        <VDataTableServer
          v-model:items-per-page="options.itemsPerPage"
          v-model:page="options.page"
          :headers="headers"
          :items="clientsList"
          :items-length="totalClients"
          :loading="isLoading"
          :items-per-page-options="itemsPerPageOptions"
          class="text-body-2 text-no-wrap"
          density="compact"
        >
          <!-- Combined Client Column with Avatar mimicking Vuexy app-user-list -->
          <template #item.cliente="{ item }">
            <div class="d-flex align-center">
              <VAvatar
                size="32"
                color="error"
                variant="tonal"
                class="mr-3"
              >
                <span class="text-sm font-weight-medium">
                  {{ getInitials(item.nombre || item.name) }}
                </span>
              </VAvatar>
              
              <div class="d-flex flex-column">
                <span class="text-body-1 font-weight-medium text-high-emphasis text-truncate" style="max-width: 250px;">
                  {{ item.nombre || item.name || 'Sin Nombre' }}
                </span>
                <span v-if="item.correo || item.email" class="text-caption text-medium-emphasis text-truncate" style="max-width: 250px;">
                  {{ item.correo || item.email }}
                </span>
              </div>
            </div>
          </template>

          <!-- Standardized ID -->
          <template #item.identificacion="{ item }">
             <span class="font-weight-medium text-caption">{{ item.identificacion || item.id || '-' }}</span>
          </template>

          <!-- Tel / Cell Slots -->
          <template #item.celular="{ item }">
             <span class="font-weight-medium">{{ item.celular || '-' }}</span>
          </template>

          <!-- Actions Column -->
          <template #item.actions="{ item }">
            <div class="d-flex gap-1">
              <IconBtn @click="openEditMode(item)">
                <VIcon icon="tabler-pencil" />
              </IconBtn>
              <IconBtn @click="confirmDeleteClient(item.id)">
                <VIcon icon="tabler-trash" color="error" />
              </IconBtn>
            </div>
          </template>

          <!-- Empty state -->
          <template #no-data>
            <div class="text-center text-body-1 py-4">
              No se encontraron clientes
            </div>
          </template>
        </VDataTableServer>
      </VCard>
    </VCol>
  </VRow>

  <!-- Sliding Drawer for Create/Edit -->
  <ClientDrawer
    v-model:isDrawerOpen="isDrawerOpen"
    :is-editing="isEditing"
    :client-data="editingData"
    @client-saved="fetchClients"
    @show-snackbar="(e) => { snackbarMessage = e.message; snackbarColor = e.color; isSnackbarVisible = true; }"
  />

  <AppConfirmDialog
    ref="confirmDialog"
    title="¿Eliminar Cliente?"
    message="¡Esta acción no se puede deshacer! ¿Estás completamente seguro de borrar a este cliente de la base de datos de Zabal Store?"
    @confirm="executeDeleteClient"
  />

  <!-- SNACKBAR -->
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
