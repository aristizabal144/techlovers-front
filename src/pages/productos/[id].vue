<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { $api } from '@/utils/api'
import ProductForm from './components/ProductForm.vue'

definePage({
  name: 'ProductEdit',
})

const router = useRouter()
const route = useRoute()
const productId = route.params.id

const isFetching = ref(true)
const initialDataForForm = ref<any>(null)

// Snackbars
const isSnackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('error')

const fetchProductData = async () => {
    try {
        const response = await $api<any>(`/product/${productId}`)
        
        if (response && !response.is_error) {
            // Map the backend DB structure manually to the Vue form structure expecting it
            const data = response.data || response // Fallback in case it's not wrapped
            
            initialDataForForm.value = {
                id: data.id,
                categoryId: data.id_categoria, // old Vue 2 payload maps 'id_categoria'
                reference: data.referencia,
                name: data.nombre,
                entryValue: data.valor_entra,
                saleValue: data.valor_venta,
                amount: data.cantidad,
                manifiestsId: data.manifiestsId,
                numberPageManifiests: data.numberPageManifiests,
                amount_count: data.cantidad_contabilidad,
                state: data.estado == 1,
                description: data.descripcion,
                urlImagen: data.urlImagen,
                barCode: data.codigo_barras
            }
        } else {
             snackbarMessage.value = response?.message || 'Error cargando datos del producto'
             snackbarColor.value = 'error'
             isSnackbarVisible.value = true
        }
    } catch (error: any) {
        console.error('Error fetching editable product', error)
        snackbarMessage.value = error.response?._data?.message || 'Error de conexión'
        snackbarColor.value = 'error'
        isSnackbarVisible.value = true
    } finally {
        isFetching.value = false
    }
}

onMounted(() => {
    fetchProductData()
})
</script>

<template>
  <div>
    <!-- Breadcrumbs & Header -->
    <div class="d-flex align-center flex-wrap mb-6">
      <div class="d-flex align-center cursor-pointer mb-2" @click="router.push('/productos')">
         <VIcon icon="tabler-arrow-left" size="20" class="mr-2 text-primary" />
         <span class="text-subtitle-1 font-weight-bold text-primary">Volver a Productos</span>
      </div>
    </div>

    <VRow>
      <VCol cols="12">
        <h2 class="text-h3 font-weight-bold mb-2">
          Editar Producto 
          <span v-if="initialDataForForm" class="text-primary ml-2">#{{ initialDataForForm.reference }}</span>
        </h2>
        <p class="text-body-1 text-medium-emphasis mb-6">
          Modifique los valores correspondientes al inventario.
        </p>
      </VCol>
    </VRow>

    <div v-if="isFetching" class="d-flex justify-center align-center" style="height: 300px;">
        <VProgressCircular indeterminate color="primary" size="48" />
    </div>

    <!-- Main Component Form in Edit Mode -->
    <ProductForm 
        v-else-if="initialDataForForm" 
        is-editing 
        :initial-data="initialDataForForm" 
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
            <VBtn color="white" variant="text" icon="tabler-x" @click="isSnackbarVisible = false"/>
        </template>
    </VSnackbar>
  </div>
</template>
