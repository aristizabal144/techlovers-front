<script setup lang="ts">
import ProductForm from './components/ProductForm.vue'
import { useRouter } from 'vue-router'

definePage({
  name: 'ProductCreate',
})

const router = useRouter()
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
          Crear Nuevo Producto
        </h2>
        <p class="text-body-1 text-medium-emphasis mb-6">
          Complete los campos a continuación para agregar un nuevo elemento al inventario.
        </p>
      </VCol>
    </VRow>

    <!-- Main Component Form in Create Mode (isEditing is false by default) -->
    <ProductForm />
  </div>
</template>
