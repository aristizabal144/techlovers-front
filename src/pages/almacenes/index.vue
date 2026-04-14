<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { $api } from '@/utils/api'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import WarehouseDrawer from './components/WarehouseDrawer.vue'

definePage({
  name: 'WarehouseList',
})

// Avatar Helpers mimicking `app-user-list`
const getInitials = (name: string) => {
  if (!name) return 'NA'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// Data table variables
const options = ref({ page: 1, itemsPerPage: 50, sortBy: [], groupBy: [], search: undefined })
const itemsPerPageOptions = [50, 100, 150, 200, 500]
const expandedRows = ref<any[]>([])

// State
const isLoading = ref(false)
const totalWarehouses = ref(0)
const warehousesList = ref<any[]>([])
const citiesSearchOptions = ref<any[]>([])
const customersSearchOptions = ref<any[]>([])

// Filters
const searchQuery = ref('')
const selectedCity = ref<any>(null)
const selectedCustomer = ref<any>(null)

// Dialogs & Drawers
const isDrawerOpen = ref(false)
const isEditing = ref(false)
const editingData = ref<any>(null)
const confirmDialog = ref<InstanceType<typeof AppConfirmDialog> | null>(null)
const itemToDelete = ref<number | string | null>(null)

// Snackbar
const isSnackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// Headers
const headers = [
  { title: 'Almacén', key: 'warehouse' },
  { title: 'Ciudad', key: 'city' },
  { title: 'Dirección', key: 'address' },
  { title: 'Encargado', key: 'manager' },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'center' as const },
]

// Perform search with params - Following old system pattern
const performSearch = async (params: any) => {
  isLoading.value = true
  try {
    console.log('🔍 Performing search:', params)
    
    const response = await $api<any>('/store/store-search', { params })
    
    console.log('📦 Search response:', response)

    if (response.is_error) {
       warehousesList.value = []
       totalWarehouses.value = 0
       console.warn('⚠️ Search returned error:', response)
       return
    }

    let targetData = response.data?.data || response.data || []
    
    // Frontend filter for customer if needed
    if (selectedCustomer.value && targetData.length > 0) {
      const customerId = typeof selectedCustomer.value === 'object' ? selectedCustomer.value.id : selectedCustomer.value
      targetData = targetData.filter((w: any) => {
        const warehouseCustomerId = w.id_cliente || w.cliente?.id
        return warehouseCustomerId == customerId
      })
    }

    warehousesList.value = targetData
    options.value.itemsPerPage = response.data?.per_page || response.per_page || 50
    totalWarehouses.value = response.data?.total || response.total || warehousesList.value.length
    
    console.log('✅ Search completed:', { count: warehousesList.value.length, total: totalWarehouses.value })

  } catch (error: any) {
    console.error('❌ Search error:', error)
    snackbarMessage.value = error.response?._data?.message || 'Error de conexión'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isLoading.value = false
  }
}

// List all warehouses - Following old system pattern
const listWarehouses = async () => {
  isLoading.value = true
  try {
    const params = {
      size: options.value.itemsPerPage,
      page: options.value.page,
    }
    
    console.log('📋 Listing all warehouses:', params)
    
    const response = await $api<any>('/store', { params })
    
    console.log('📦 List response:', response)

    if (response.is_error) {
       warehousesList.value = []
       totalWarehouses.value = 0
       console.warn('⚠️ List returned error:', response)
       return
    }

    warehousesList.value = response.data?.data || response.data || []
    options.value.itemsPerPage = response.data?.per_page || response.per_page || 50
    totalWarehouses.value = response.data?.total || response.total || warehousesList.value.length
    
    console.log('✅ List completed:', { count: warehousesList.value.length, total: totalWarehouses.value })

  } catch (error: any) {
    console.error('❌ List error:', error)
    snackbarMessage.value = error.response?._data?.message || 'Error de conexión'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isLoading.value = false
  }
}

// API Requests - Main fetch function that decides which method to use
const fetchWarehouses = async () => {
  // If city is selected, use search
  if (selectedCity.value) {
    const cityName = typeof selectedCity.value === 'object' ? selectedCity.value.nombre : selectedCity.value
    if (cityName) {
      const params: any = {
        size: options.value.itemsPerPage,
        page: options.value.page,
        ciudad: cityName,
      }
      if (searchQuery.value && searchQuery.value.trim()) {
        params.input = searchQuery.value.trim()
      }
      await performSearch(params)
      return
    }
  }
  
  // If search query exists, use search
  if (searchQuery.value && searchQuery.value.trim()) {
    const params = {
      size: options.value.itemsPerPage,
      page: options.value.page,
      input: searchQuery.value.trim(),
    }
    await performSearch(params)
    return
  }
  
  // If only customer is selected (no city, no search), fetch customer with warehouses from backend
  if (selectedCustomer.value) {
    await fetchWarehousesByCustomer()
    return
  }
  
  // Otherwise, list all
  await listWarehouses()
}

// Fetch warehouses by customer ID - Following old system pattern
const fetchWarehousesByCustomer = async () => {
  isLoading.value = true
  try {
    const customerId = typeof selectedCustomer.value === 'object' ? selectedCustomer.value.id : selectedCustomer.value
    
    console.log('� Fetching customer with warehouses:', { customerId })
    
    // Call backend to get customer with warehouses
    const response = await $api<any>(`/client/${customerId}`)
    
    console.log('📦 Customer response:', response)

    if (response.is_error) {
       warehousesList.value = []
       totalWarehouses.value = 0
       console.warn('⚠️ Customer fetch returned error:', response)
       return
    }

    // Get warehouses from customer object (like old system)
    const customerData = response.data || response
    const warehouses = customerData.almacenes || []
    
    // Enrich warehouses with customer info
    warehousesList.value = warehouses.map((w: any) => ({
      ...w,
      cliente: {
        id: customerData.id,
        identificacion: customerData.identificacion,
        nombre: customerData.nombre,
        telefono_fijo: customerData.telefono_fijo,
        celular: customerData.celular,
        correo: customerData.correo,
        descripcion: customerData.descripcion,
      }
    }))
    
    totalWarehouses.value = warehousesList.value.length
    
    console.log('✅ Customer warehouses loaded:', { count: warehousesList.value.length })

  } catch (error: any) {
    console.error('❌ Error fetching customer warehouses:', error)
    snackbarMessage.value = error.response?._data?.message || 'Error de conexión'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isLoading.value = false
  }
}

// Global search trigger
const onSearch = () => {
  options.value.page = 1
  fetchWarehouses()
}

// Search timeout for debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Search Customers for filter
const searchCustomers = async (query: string) => {
  if (!query || query.length < 2) {
    customersSearchOptions.value = []
    return
  }
  try {
    const response = await $api<any>('/client/client-search', {
      params: { input: query, size: 20 }
    })
    customersSearchOptions.value = response.data || []
  } catch (error) {
    console.error('Error searching customers:', error)
  }
}

// Search Cities for filter - Following old system pattern
const searchCities = async (query: string) => {
  if (!query || query.length < 2) {
    citiesSearchOptions.value = []
    return
  }
  try {
    const response = await $api<any>('/ciudades-search', {
      params: { input: query, size: 20 }
    })
    citiesSearchOptions.value = response?.data || response || []
  } catch (error) {
    console.error('Error searching cities:', error)
  }
}

// Handle city selection - Following old system pattern
const onCitySelected = () => {
  console.log('🏙️ City selected:', selectedCity.value)
  // Build params for search
  const params: any = {
    size: options.value.itemsPerPage,
    page: 1, // Reset to first page
  }
  
  // Add city to params
  if (selectedCity.value) {
    const cityName = typeof selectedCity.value === 'object' ? selectedCity.value.nombre : selectedCity.value
    if (cityName) {
      params.ciudad = cityName
    }
  }
  
  // Add search input if exists (combine filters like old system)
  if (searchQuery.value && searchQuery.value.trim()) {
    params.input = searchQuery.value.trim()
  }
  
  // Always use search endpoint when city is selected
  performSearch(params)
}

// Watch for customer changes only (city is handled by onCitySelected)
watch(selectedCustomer, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    options.value.page = 1
    fetchWarehouses()
  }, 300)
})

// Drawer Modals
const openCreateMode = () => {
  isEditing.value = false
  editingData.value = null
  isDrawerOpen.value = true
}

const openEditMode = (warehouse: any) => {
  isEditing.value = true
  editingData.value = { ...warehouse }
  isDrawerOpen.value = true
}

// Delete Logic
const confirmDeleteWarehouse = (id: string | number) => {
  itemToDelete.value = id
  confirmDialog.value?.open()
}

const executeDeleteWarehouse = async () => {
  if (!itemToDelete.value) return
  isLoading.value = true
  
  try {
    const response = await $api<any>(`/store/${itemToDelete.value}`, { method: 'DELETE' })
    if (response && response.is_error) {
       snackbarMessage.value = response.message || 'Error al eliminar el almacén'
       snackbarColor.value = 'error'
       isSnackbarVisible.value = true
       return
    }
    
    snackbarMessage.value = 'Almacén eliminado exitosamente'
    snackbarColor.value = 'success'
    isSnackbarVisible.value = true
    await fetchWarehouses()
    
  } catch (error: any) {
    const errorData = error.response?._data || error.data || {}
    snackbarMessage.value = errorData.message || error.message || 'Error de conexión'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    itemToDelete.value = null
    isLoading.value = false
  }
}

watch([() => options.value.page, () => options.value.itemsPerPage], () => {
  fetchWarehouses()
})

onMounted(() => {
  fetchWarehouses()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center pa-5 pb-2">
          <div>
            <h5 class="text-h5 font-weight-bold d-flex align-center gap-2">
              <VIcon icon="tabler-building-warehouse" color="primary" size="28" />
              Directorio de Almacenes
            </h5>
            <p class="text-body-2 text-medium-emphasis mb-0 mt-1">
              Gestión de almacenes y puntos de venta
            </p>
          </div>
        </VCardTitle>
        
        <!-- CARD HEADER / TOOLBAR -->
        <VCardText class="d-flex flex-wrap gap-4 align-center justify-space-between pb-6">
          <div class="d-flex align-center flex-wrap gap-4 flex-grow-1">
            <!-- Search Input -->
            <div style="width: 200px;">
              <VTextField
                v-model="searchQuery"
                placeholder="Buscar almacén o NIT..."
                density="compact"
                hide-details
                prepend-inner-icon="tabler-search"
                @keyup.enter="onSearch"
              />
            </div>
            
            <!-- Customer Filter -->
            <div style="width: 220px;">
              <VAutocomplete
                v-model="selectedCustomer"
                :items="customersSearchOptions"
                item-title="nombre"
                item-value="id"
                placeholder="Filtrar por cliente"
                density="compact"
                hide-details
                clearable
                prepend-inner-icon="tabler-user"
                @update:search="searchCustomers"
              />
            </div>
            
            <!-- City Filter -->
            <div style="width: 180px;">
              <VAutocomplete
                v-model="selectedCity"
                :items="citiesSearchOptions"
                item-title="nombre"
                item-value="nombre"
                placeholder="Filtrar por ciudad"
                density="compact"
                hide-details
                clearable
                prepend-inner-icon="tabler-map-pin"
                @update:search="searchCities"
                @update:model-value="onCitySelected"
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
              Nuevo Almacén
            </VBtn>
          </div>
        </VCardText>

        <VDivider />

        <!-- DATA TABLE -->
        <VDataTableServer
          v-model:items-per-page="options.itemsPerPage"
          v-model:page="options.page"
          v-model:expanded="expandedRows"
          :headers="headers"
          :items="warehousesList"
          :items-length="totalWarehouses"
          :loading="isLoading"
          :items-per-page-options="itemsPerPageOptions"
          class="text-body-2 text-no-wrap"
          density="compact"
          show-expand
          expand-on-click
        >
          <!-- Warehouse Column - Ultra Compact -->
          <template #item.warehouse="{ item }">
            <div class="d-flex align-center">
              <VAvatar
                size="28"
                color="error"
                variant="tonal"
                class="me-2"
              >
                <span class="text-xs font-weight-medium">
                  {{ getInitials(item.nombre) }}
                </span>
              </VAvatar>
              <div class="d-flex flex-column justify-center text-truncate" style="max-width: 180px;">
                <span class="text-body-2 font-weight-medium text-high-emphasis">
                  {{ item.nombre || 'Sin Nombre' }}
                </span>
                <span class="text-caption text-disabled">
                  NIT: {{ item.cliente?.identificacion || item.nit || '-' }}
                </span>
              </div>
            </div>
          </template>

          <!-- City Column -->
          <template #item.city="{ item }">
            <div class="text-truncate" style="max-width: 150px;">
              <span class="text-body-2 text-high-emphasis">
                {{ item.ciudad || '-' }}
              </span>
            </div>
          </template>

          <!-- Address Column -->
          <template #item.address="{ item }">
            <div class="d-flex flex-column">
              <div class="d-flex align-center text-truncate" style="max-width: 140px;">
                <VIcon
                  size="16"
                  icon="tabler-building"
                  color="disabled"
                  class="me-1"
                />
                <span class="text-body-2 text-high-emphasis">
                  {{ item.barrio || '-' }}
                </span>
              </div>
              <div class="d-flex align-center text-truncate" style="max-width: 140px;">
                <VIcon
                  size="16"
                  icon="tabler-route"
                  color="disabled"
                  class="me-1"
                />
                <span class="text-caption text-disabled">
                  {{ item.direccion || '-' }}
                </span>
              </div>
            </div>
          </template>

          <!-- Manager Column -->
          <template #item.manager="{ item }">
            <div class="d-flex flex-column">
              <div class="d-flex align-center">
                <VIcon
                  size="16"
                  icon="tabler-user"
                  color="disabled"
                  class="me-1"
                />
                <span class="text-body-2 text-high-emphasis">
                  {{ item.encargado || '-' }}
                </span>
              </div>
              <div class="d-flex align-center">
                <VIcon
                  size="16"
                  icon="tabler-phone"
                  color="disabled"
                  class="me-1"
                />
                <span class="text-caption text-disabled">
                  {{ item.telefono || '-' }}
                </span>
              </div>
            </div>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <div class="d-flex gap-1 justify-center">
              <IconBtn @click.stop="openEditMode(item)">
                <VIcon icon="tabler-pencil" />
              </IconBtn>
              <IconBtn @click.stop="confirmDeleteWarehouse(item.id)">
                <VIcon icon="tabler-trash" color="error" />
              </IconBtn>
            </div>
          </template>

          <!-- Expandable Row Content: Deep Customer Information -->
          <template #expanded-row="{ item }">
            <tr>
              <td colspan="5">
                <div class="py-4 px-6 bg-grey-50 rounded-lg my-2 mx-4 elevation-1">
                  <h4 class="text-h6 mb-3 text-primary d-flex align-center gap-2">
                    <VIcon icon="tabler-user-circle" /> {{ item.cliente?.nombre || 'Datos del Cliente' }}
                  </h4>
                  <VRow>
                    <VCol cols="12" md="3" sm="6">
                      <p class="text-caption text-disabled mb-0 text-uppercase">Identificación</p>
                      <p class="font-weight-medium mb-0">{{ item.cliente?.identificacion || '-' }}</p>
                    </VCol>
                    <VCol cols="12" md="3" sm="6">
                      <p class="text-caption text-disabled mb-0 text-uppercase">Correo Electrónico</p>
                      <p class="font-weight-medium mb-0 text-primary">
                        <a v-if="item.cliente?.correo" :href="`mailto:${item.cliente?.correo}`" class="text-decoration-none">
                          {{ item.cliente?.correo }}
                        </a>
                        <span v-else class="text-black">-</span>
                      </p>
                    </VCol>
                    <VCol cols="12" md="3" sm="6">
                      <p class="text-caption text-disabled mb-0 text-uppercase">Celular</p>
                      <p class="font-weight-medium mb-0">{{ item.cliente?.celular || '-' }}</p>
                    </VCol>
                    <VCol cols="12" md="3" sm="6">
                      <p class="text-caption text-disabled mb-0 text-uppercase">Teléfono Fijo</p>
                      <p class="font-weight-medium mb-0">{{ item.cliente?.telefono_fijo || '-' }}</p>
                    </VCol>
                  </VRow>
                </div>
              </td>
            </tr>
          </template>

          <template #no-data>
            <div class="text-center text-body-1 py-4">
              No hay almacenes registrados
            </div>
          </template>
        </VDataTableServer>
      </VCard>
    </VCol>
  </VRow>

  <WarehouseDrawer
    v-model:isDrawerOpen="isDrawerOpen"
    :is-editing="isEditing"
    :warehouse-data="editingData"
    @warehouse-saved="fetchWarehouses"
    @show-snackbar="(e) => { snackbarMessage = e.message; snackbarColor = e.color; isSnackbarVisible = true; }"
  />

  <AppConfirmDialog
    ref="confirmDialog"
    title="¿Eliminar Almacén?"
    message="¡Esta acción no se puede deshacer! ¿Estás completamente seguro de borrar este almacén del inventario global?"
    @confirm="executeDeleteWarehouse"
  />

  <VSnackbar
    v-model="isSnackbarVisible"
    :color="snackbarColor"
    location="top end"
    :timeout="3000"
  >
    {{ snackbarMessage }}
    <template #actions>
      <VBtn color="white" variant="text" icon="tabler-x" @click="isSnackbarVisible = false" />
    </template>
  </VSnackbar>
</template>

<style lang="scss" scoped>
// Minimal styles following Vuexy pattern
.text-capitalize {
  text-transform: capitalize;
}
</style>
