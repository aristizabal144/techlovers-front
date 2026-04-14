<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CategoryDrawer from './components/CategoryDrawer.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import { $api } from '@/utils/api'

definePage({
  name: 'CategoryList',
})

// Data tables logic
const searchQuery = ref('')
const totalData = ref(0)

interface CategoryItem {
  id: number
  nombre: string
  descripcion: string
  estado: number
  [key: string]: any
}

const tableData = ref<CategoryItem[]>([])
const isLoading = ref(false)

// Pagination logic
const options = ref({ page: 1, itemsPerPage: 50, sortBy: [], groupBy: [], search: undefined })
const itemsPerPageOptions = [50, 100, 150, 200, 500]

// Headers for DataTable
const headers = [
  { title: 'Nombre', key: 'nombre' },
  { title: 'Descripción', key: 'descripcion' },
  { title: 'Estado', key: 'estado' },
  { title: 'Acciones', key: 'actions', sortable: false },
]

// Drawer logic
interface CategoryData {
  nombre: string
  descripcion: string
  estado: boolean
}
const isDrawerOpen = ref(false)
const isSubmitting = ref(false)
const editingCategoryId = ref<number | null>(null)
const editingData = ref<CategoryData>({ nombre: '', descripcion: '', estado: true })

const confirmDialog = ref<InstanceType<typeof AppConfirmDialog> | null>(null)
const itemToDelete = ref<number | null>(null)

// Snackbar 
const isSnackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('error')

const fetchCategories = async () => {
  isLoading.value = true
  try {
    let endpoint = '/categorie'
    let params: any = {
      size: options.value.itemsPerPage,
      page: options.value.page
    }

    if (searchQuery.value) {
      endpoint = '/categorie/categorie-search'
      params.input = searchQuery.value
    }

    const response = await $api<{ is_error?: boolean, message?: string, data: any, per_page: number, total: number }>(endpoint, { params })
    
    if (response.is_error) {
      tableData.value = []
      snackbarMessage.value = response.message || 'Error al cargar categorías'
      snackbarColor.value = 'error'
      isSnackbarVisible.value = true
      return
    }

    // Adjust mapping based on search response format vs normal get format from original code
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

// Actions
const openAddDrawer = () => {
  editingCategoryId.value = null
  editingData.value = { nombre: '', descripcion: '', estado: true }
  isDrawerOpen.value = true
}

const editCategory = (item: CategoryItem) => {
  editingCategoryId.value = item.id
  editingData.value = {
    nombre: item.nombre || '',
    descripcion: item.descripcion || '',
    estado: item.estado === 1,
  }
  isDrawerOpen.value = true
}

const confirmDeleteCategory = (id: number) => {
  itemToDelete.value = id
  confirmDialog.value?.open()
}

const executeDeleteCategory = async () => {
  if (!itemToDelete.value) return

  try {
    const response = await $api<{ is_error?: boolean, message?: string }>(`/categorie/${itemToDelete.value}`, { method: 'DELETE' })
    if (response.is_error) {
      snackbarMessage.value = response.message || 'Error al eliminar categoría'
      snackbarColor.value = 'error'
      isSnackbarVisible.value = true
      return
    }

    fetchCategories()
    snackbarMessage.value = 'Categoría eliminada exitosamente'
    snackbarColor.value = 'success'
    isSnackbarVisible.value = true
  } catch (error: any) {
    console.error('Error deleting category', error)
    snackbarMessage.value = error.response?._data?.message || error.data?.message || 'Error de conexión al eliminar la categoría'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    itemToDelete.value = null
  }
}

const onDrawerSubmit = async (data: any, id?: number | null) => {
  const payload = {
    ...data,
    estado: data.estado ? 1 : 0
  }

  isSubmitting.value = true

  try {
    let response: { is_error?: boolean, message?: string }

    if (id) {
      response = await $api(`/categorie/${id}`, { method: 'PUT', body: payload })
    } else {
      response = await $api('/categorie', { method: 'POST', body: payload })
    }

    if (response.is_error) {
      snackbarMessage.value = response.message || 'Error al guardar la categoría'
      snackbarColor.value = 'error'
      isSnackbarVisible.value = true
      return
    }

    isDrawerOpen.value = false
    fetchCategories()
    snackbarMessage.value = id ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente'
    snackbarColor.value = 'success'
    isSnackbarVisible.value = true
  } catch (error: any) {
    console.error('Error saving category', error)
    snackbarMessage.value = error.response?._data?.message || error.data?.message || 'Error de conexión al guardar categoría'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isSubmitting.value = false
  }
}

// Watchers and lifecycle hooks
watch([() => options.value.page, () => options.value.itemsPerPage], () => {
  fetchCategories()
})

const onSearch = () => {
  options.value.page = 1
  fetchCategories()
}

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-5 pb-2">
      <div>
        <h5 class="text-h5 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-category" color="primary" size="28" />
          Gestión de Categorías
        </h5>
        <p class="text-body-2 text-medium-emphasis mb-0 mt-1">
          Organización y clasificación de productos
        </p>
      </div>
    </VCardTitle>

    <VCardText class="d-flex flex-wrap gap-4 align-center justify-space-between">
      <div class="d-flex align-center gap-4">
        <div style="width: 250px;">
          <VTextField
            v-model="searchQuery"
            placeholder="Buscar..."
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

      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        @click="openAddDrawer"
      >
        Crear Categoría
      </VBtn>
    </VCardText>

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
      <template #item.estado="{ item }">
        <VChip
          :color="item.estado === 1 ? 'success' : 'error'"
          size="small"
        >
          {{ item.estado === 1 ? 'Activo' : 'Inactivo' }}
        </VChip>
      </template>

      <template #item.actions="{ item }">
        <div class="d-flex gap-1">
          <IconBtn @click="editCategory(item)">
            <VIcon icon="tabler-pencil" />
          </IconBtn>
          <IconBtn @click="confirmDeleteCategory(item.id)">
            <VIcon icon="tabler-trash" color="error" />
          </IconBtn>
        </div>
      </template>

      <!-- empty state -->
      <template #no-data>
        <div class="text-center text-body-1 py-4">
          No hay datos disponibles
        </div>
      </template>
    </VDataTableServer>
  </VCard>

  <!-- Drawer (Moved outside VCard for proper global overlay) -->
  <CategoryDrawer
    v-model:is-drawer-open="isDrawerOpen"
    :editing-category-id="editingCategoryId"
    :initial-data="editingData"
    :is-submitting="isSubmitting"
    @submit="onDrawerSubmit"
  />

  <AppConfirmDialog
    ref="confirmDialog"
    title="¿Eliminar Categoría?"
    message="¡Esta acción no se puede deshacer! ¿Estás completamente seguro de eliminar esta categoría del sistema?"
    @confirm="executeDeleteCategory"
  />

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
