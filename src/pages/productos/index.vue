<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { $api } from '@/utils/api'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import { useAuthStore } from '@/stores/useAuthStore'

definePage({
  name: 'ProductList',
})

const router = useRouter()
const authStore = useAuthStore()

// Current authenticatd role
const currentRole = computed(() => String(authStore.auth?.rol || localStorage.getItem('app-current-role')))

// Inventory Totals
const inventory = ref({
  total_base: 0,
  total_sale: 0,
  total: 0
})

// Filters
const searchQuery = ref('')
const selectedState = ref(2) // 2 means "ALL"
const selectedCategory = ref<number | null>(null)
const categories = ref<any[]>([])

const stateOptions = [
  { title: 'TODO', value: 2 },
  { title: 'ACTIVO', value: 1 },
  { title: 'INACTIVO', value: 0 }
]

// Fetching State
const isLoading = ref(false)
const totalData = ref(0)
const tableData = ref<any[]>([])

// Pagination
const options = ref({ page: 1, itemsPerPage: 50, sortBy: [], groupBy: [], search: undefined })
const itemsPerPageOptions = [50, 100, 150, 200, 500]

// User Simulation (assuming standard implementation pulls auth store or uses pinia, defaulting visually to admin logic '1' for now)
const userRole = ref('1') // Ensure role logic maps later if needed from local storage 

// Columns Definition
const headers = [
  { title: 'Estado', key: 'estado', width: '80px' },
  { title: 'Ref', key: 'referencia', width: '60px' },
  { title: 'Nombre', key: 'nombre' },
  { title: 'V. Entra', key: 'valor_entra', width: '100px' },
  { title: '% V.', key: 'porcentaje_venta', width: '60px' },
  { title: 'V. Sale', key: 'valor_venta', width: '100px' },
  { title: 'Cant', key: 'cantidad', width: '70px' },
  { title: 'Acciones', key: 'actions', sortable: false, width: '100px', align: 'center' as const },
]

// Snackbar 
const isSnackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('error')

// Dialogs
const confirmDialog = ref<InstanceType<typeof AppConfirmDialog> | null>(null)
const itemToDelete = ref<number | null>(null)

const fetchInventoryTotals = async () => {
  try {
    const response = await $api<any>('/product/get-inventory')
    if (response && !response.is_error) {
      inventory.value.total_base = response.valor_entrada || 0
      inventory.value.total_sale = response.valor_salida || 0
      inventory.value.total = response.total_inventario || 0
    }
  } catch (error) {
    console.error('Error fetching inventory totals:', error)
  }
}

const fetchCategories = async () => {
  try {
    const response = await $api<any>('/categorie', { params: { size: 500 } })
    if (response && !response.is_error) {
      categories.value = response.data?.data || []
    }
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
}

const fetchProducts = async () => {
  isLoading.value = true
  try {
    let endpoint = '/product'
    let params: any = {
      size: options.value.itemsPerPage,
      page: options.value.page,
      state: selectedState.value
    }

    if (selectedCategory.value) {
       params.category_id = selectedCategory.value
    }

    if (searchQuery.value) {
      endpoint = '/product/product-search'
      params.input = searchQuery.value
    }

    const response = await $api<any>(endpoint, { params })
    
    if (response.is_error) {
      tableData.value = []
      snackbarMessage.value = response.message || 'Error al cargar productos'
      snackbarColor.value = 'error'
      isSnackbarVisible.value = true
      return
    }

    // Mapping exact same paths as before in categories. Normal endpoint wraps in `{data: {data: []}}`, Search usually `{data: []}`
    if (searchQuery.value) {
      tableData.value = response.data || []
      options.value.itemsPerPage = response.per_page || 50
      totalData.value = response.total || 0
    } else {
      tableData.value = response.data?.data || []
      options.value.itemsPerPage = response.data?.per_page || 50
      totalData.value = response.data?.total || 0
    }
  } catch (error: any) {
    console.error(error)
    snackbarMessage.value = error.response?._data?.message || error.data?.message || 'Error de conexión'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isLoading.value = false
  }
}

const onSearch = () => {
  options.value.page = 1
  fetchProducts()
}

const navigateToCreate = () => {
  router.push('/productos/crear')
}

// View Mode State
const viewMode = ref<'list' | 'grid'>('list')

// Image Modal State
const isImageModalOpen = ref(false)
const focusedImageUrl = ref('')
const focusedImageTitle = ref('')

const openImageModal = (url: string, title: string) => {
  if (url && url.length > 30) {
    focusedImageUrl.value = url
    focusedImageTitle.value = title
    isImageModalOpen.value = true
  }
}

const navigateToEdit = (id: number) => {
  router.push(`/productos/${id}`)
}

const openCatalog = () => {
  window.open('/productos/catalogo/imprimir', '_blank')
}

const confirmDeleteProduct = (id: number) => {
  itemToDelete.value = id
  confirmDialog.value?.open()
}

const executeDeleteProduct = async () => {
  if (!itemToDelete.value) return

  isLoading.value = true
  try {
    const response = await $api<any>(`/product/${itemToDelete.value}`, { method: 'DELETE' })
    if (response && response.is_error) {
      snackbarMessage.value = response.message || 'Error al eliminar producto'
      snackbarColor.value = 'error'
      isSnackbarVisible.value = true
      return
    }

    await fetchProducts()
    await fetchInventoryTotals()
    snackbarMessage.value = 'Producto eliminado exitosamente'
    snackbarColor.value = 'success'
    isSnackbarVisible.value = true
  } catch (error: any) {
    console.error('Error deleting product', error)
    const errorData = error.response?._data || error.data || {}
    snackbarMessage.value = errorData.message || error.message || 'Error de conexión al eliminar'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isLoading.value = false
    itemToDelete.value = null
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

watch([() => options.value.page, () => options.value.itemsPerPage, selectedState, selectedCategory], () => {
  fetchProducts()
})

onMounted(() => {
  fetchCategories()
  fetchInventoryTotals()
  fetchProducts()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center pa-5 pb-2">
          <div>
            <h5 class="text-h5 font-weight-bold d-flex align-center gap-2">
              <VIcon icon="tabler-packages" color="primary" size="28" />
              Gestión de Productos
            </h5>
            <p class="text-body-2 text-medium-emphasis mb-0 mt-1">
              Inventario y catálogo de productos
            </p>
          </div>
        </VCardTitle>

        <VCardText class="d-flex flex-wrap gap-4 align-center justify-space-between pb-6">
          <div class="d-flex align-center flex-wrap gap-4 flex-grow-1">
            <div style="width: 250px;">
              <VTextField
                v-model="searchQuery"
                placeholder="Buscar referencia o nombre..."
                density="compact"
                hide-details
                prepend-inner-icon="tabler-search"
                @keyup.enter="onSearch"
              />
            </div>
            
            <div style="width: 200px;">
              <VSelect
                v-model="selectedState"
                :items="stateOptions"
                density="compact"
                hide-details
                prepend-inner-icon="tabler-activity"
              />
            </div>

            <div style="width: 250px;">
              <VSelect
                v-model="selectedCategory"
                :items="categories"
                item-title="nombre"
                item-value="id"
                placeholder="Categoría"
                clearable
                density="compact"
                hide-details
                prepend-inner-icon="tabler-category"
              />
            </div>
            
            <VBtn
              color="primary"
              variant="tonal"
              @click="onSearch"
            >
              Buscar
            </VBtn>
            
            <VBtnToggle
              v-model="viewMode"
              color="primary"
              variant="outlined"
              density="compact"
              class="ml-auto"
              mandatory
            >
              <VBtn value="list" prepend-icon="tabler-list" />
              <VBtn value="grid" prepend-icon="tabler-layout-grid" />
            </VBtnToggle>
          </div>

          <div class="d-flex gap-4">
            <VBtn
              color="secondary"
              variant="tonal"
              prepend-icon="tabler-book"
              @click="openCatalog"
            >
              Generar Catálogo
            </VBtn>
            
            <VBtn
              v-if="currentRole !== '2'"
              color="primary"
              prepend-icon="tabler-plus"
              @click="navigateToCreate"
            >
              Crear Producto
            </VBtn>
          </div>
        </VCardText>
        
        <VDivider />

        <!-- List View -->
        <VDataTableServer
          v-if="viewMode === 'list'"
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
          <!-- Status Column -->
          <template #item.estado="{ item }">
            <VChip
              :color="item.estado === 1 ? 'success' : 'error'"
              size="small"
              class="text-uppercase"
            >
              {{ item.estado === 1 ? 'Activo' : 'Inactivo' }}
            </VChip>
          </template>

          <!-- Referencia -->
          <template #item.referencia="{ item }">
            <span class="font-weight-medium text-caption">{{ item.referencia }}</span>
          </template>

          <!-- Nombre -->
          <template #item.nombre="{ item }">
            <div class="d-flex flex-column" style="min-width: 200px; white-space: normal;">
              <span class="text-body-2 font-weight-medium">{{ item.nombre }}</span>
              <span v-if="item.categoria?.nombre" class="text-caption text-medium-emphasis">Cat: {{ item.categoria.nombre }}</span>
            </div>
          </template>

          <!-- Values with formatting -->
          <template #item.valor_entra="{ item }">
            <span class="font-weight-medium text-caption">{{ formatCurrency(item.valor_entra) }}</span>
          </template>

          <template #item.porcentaje_venta="{ item }">
            <span class="font-weight-bold text-info text-caption">{{ item.porcentaje_venta }}%</span>
          </template>
          
          <template #item.valor_venta="{ item }">
            <span class="font-weight-medium text-success text-caption">{{ formatCurrency(item.valor_venta) }}</span>
          </template>

          <!-- Quantity Badge -->
          <template #item.cantidad="{ item }">
            <VChip
              :color="item.cantidad > 10 ? 'success' : 'error'"
              size="small"
              variant="elevated"
            >
              {{ item.cantidad }}
            </VChip>
          </template>

          <!-- Actions Column -->
          <template #item.actions="{ item }">
            <div class="d-flex gap-1">
              <IconBtn @click="navigateToEdit(item.id)">
                <VIcon icon="tabler-pencil" />
              </IconBtn>
              <IconBtn @click="confirmDeleteProduct(item.id)">
                <VIcon icon="tabler-trash" color="error" />
              </IconBtn>
            </div>
          </template>

          <!-- Empty state -->
          <template #no-data>
            <div class="text-center text-body-1 py-4">
              No se encontraron productos
            </div>
          </template>
        </VDataTableServer>
        
        <!-- Grid View -->
        <div v-else class="pa-4 bg-var-theme-background">
            <VRow v-if="isLoading">
                <VCol v-for="i in 6" :key="i" cols="12" sm="6" md="4" lg="4">
                    <VSkeletonLoader type="card, article, actions"></VSkeletonLoader>
                </VCol>
            </VRow>
            
            <VRow v-else-if="tableData.length > 0">
                <VCol 
                    v-for="item in tableData" 
                    :key="item.id"
                    cols="12" sm="6" md="4" lg="4"
                >
                    <VCard class="h-100 d-flex flex-column border rounded-lg transition-swing hover-elevation-4" style="border-color: rgba(var(--v-theme-on-surface), 0.08) !important;">
                        <!-- Clean Image Area (No over-image text) -->
                        <div 
                            class="d-flex justify-center align-center bg-grey-50 cursor-pointer" 
                            style="height: 350px; width: 100%;"
                            @click="openImageModal(item.urlImagen, item.nombre)"
                            title="Haz clic para ver la imagen completa"
                        >
                            <VImg
                                :src="item.urlImagen && item.urlImagen.length > 30 ? item.urlImagen : 'https://placehold.co/400x400/eeeeee/999999?text=Sin+Imagen'"
                                height="100%"
                                width="100%"
                                cover
                                class="transition-swing hover-scale"
                            >
                                <template #placeholder>
                                    <div class="d-flex align-center justify-center fill-height">
                                        <VProgressCircular color="primary" indeterminate></VProgressCircular>
                                    </div>
                                </template>
                            </VImg>
                        </div>

                        <!-- Card Body -->
                        <VCardText class="d-flex flex-column flex-grow-1 px-4 pt-4 pb-2">
                            <!-- Status Badges -->
                            <div class="d-flex align-center justify-space-between mb-3">
                                <VChip
                                    :color="item.estado === 1 ? 'success' : 'secondary'"
                                    size="x-small"
                                    variant="flat"
                                    class="text-uppercase font-weight-medium px-2"
                                >
                                    {{ item.estado === 1 ? 'Activo' : 'Inactivo' }}
                                </VChip>
                                <div class="text-caption d-flex align-center gap-1" :class="item.cantidad >= 10 ? 'text-medium-emphasis' : 'text-error font-weight-medium'">
                                    <VIcon icon="tabler-packages" size="14" />
                                    <span>{{ item.cantidad }} en stock</span>
                                </div>
                            </div>

                            <!-- Typography -->
                            <h3 class="text-subtitle-1 font-weight-medium text-high-emphasis text-truncate mb-1" :title="item.nombre">
                                {{ item.nombre }}
                            </h3>
                            <div class="text-caption text-disabled mb-auto">
                                REF: {{ item.referencia }}
                            </div>

                            <!-- Spacer -->
                            <div class="mt-4 pb-1">
                                <span class="text-h6 font-weight-semibold text-primary">
                                    {{ formatCurrency(item.valor_venta) }}
                                </span>
                            </div>
                        </VCardText>

                        <VDivider></VDivider>

                        <!-- Minimalist Actions -->
                        <div class="d-flex justify-end px-2 py-1 bg-surface" style="background-color: rgba(var(--v-theme-on-surface), 0.02) !important;">
                            <IconBtn size="small" color="primary" @click="navigateToEdit(item.id)">
                                <VIcon icon="tabler-edit" size="20" />
                            </IconBtn>
                            <IconBtn size="small" color="error" class="ml-1" @click="confirmDeleteProduct(item.id)">
                                <VIcon icon="tabler-trash" size="20" />
                            </IconBtn>
                        </div>
                    </VCard>
                </VCol>
            </VRow>
            
            <div v-else class="text-center py-10 opacity-70">
                <VIcon icon="tabler-mood-empty" size="64" class="mb-4 text-disabled"></VIcon>
                <h3 class="text-h6 text-disabled">No se encontraron productos</h3>
            </div>
            
            <!-- Grid Pagination Controls -->
            <div v-if="!isLoading && tableData.length > 0" class="d-flex align-center justify-center mt-6">
                <!-- VPagination binds directly to the same options state that VDataTable uses -->
                <VPagination
                    v-model="options.page"
                    :length="Math.ceil(totalData / options.itemsPerPage)"
                    :total-visible="5"
                    color="primary"
                    rounded="circle"
                ></VPagination>
            </div>
        </div>

        <!-- Professional Summary Footer -->
        <VDivider />
        <VCardText class="bg-var(--v-theme-surface) text-high-emphasis pt-4 pb-4 overflow-x-auto">
          <div class="d-flex flex-nowrap justify-space-between align-center" style="min-width: 600px;">
            <div class="d-flex flex-column align-start">
              <span class="text-caption text-medium-emphasis mb-1 text-uppercase">Inventario Base</span>
              <span class="text-subtitle-1 font-weight-bold">{{ formatCurrency(inventory.total_base) }}</span>
            </div>
            
            <VDivider vertical class="mx-4" />
            
            <div class="d-flex flex-column align-center">
              <span class="text-caption text-medium-emphasis mb-1 text-uppercase">Inventario Venta</span>
              <span class="text-subtitle-1 font-weight-bold">{{ formatCurrency(inventory.total_sale) }}</span>
            </div>

            <VDivider vertical class="mx-4" />
            
            <div class="d-flex flex-column align-end">
              <span class="text-subtitle-2 font-weight-bold mb-1 text-uppercase">Total</span>
              <span class="text-h6 font-weight-bold text-primary">{{ formatCurrency(inventory.total) }}</span>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <AppConfirmDialog
    ref="confirmDialog"
    title="¿Eliminar Producto?"
    message="¡Esta acción no se puede deshacer! ¿Estás completamente seguro de eliminar el producto y removerlo del inventario?"
    @confirm="executeDeleteProduct"
  />

  <!-- Fullscreen Image Lightbox Modal -->
  <VDialog v-model="isImageModalOpen" max-width="800" transition="dialog-zoom-transition">
    <VCard class="bg-transparent shadow-none" elevation="0">
      <div class="d-flex justify-end mb-2">
        <IconBtn color="error" variant="elevated" class="bg-surface elevation-3" @click="isImageModalOpen = false">
          <VIcon icon="tabler-x" />
        </IconBtn>
      </div>
      <VCardText class="pa-0 d-flex justify-center align-center bg-transparent position-relative">
        <VImg
          :src="focusedImageUrl"
          :alt="focusedImageTitle"
          max-height="85vh"
          max-width="100%"
          contain
          class="rounded-lg elevation-4 bg-white"
        >
          <template #placeholder>
            <div class="d-flex align-center justify-center fill-height bg-grey-darken-2 rounded-lg">
                <VProgressCircular color="white" indeterminate></VProgressCircular>
            </div>
          </template>
        </VImg>
      </VCardText>
    </VCard>
  </VDialog>

  <!-- Snackbar for Error/Success Messages -->
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
