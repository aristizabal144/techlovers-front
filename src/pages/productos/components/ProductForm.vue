<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { VForm } from 'vuetify/components/VForm'
import { $api } from '@/utils/api'
import JsBarcode from 'jsbarcode'

interface ProductData {
  id?: number
  categoryId: number | null
  reference: string
  name: string
  entryValue: number
  saleValue: number
  amount: number
  numberPageManifiests: string | number
  manifiestsId: number | null
  amount_count: number
  state: boolean
  description: string
  urlImagen?: string
  barCode: string
}

interface Props {
  initialData?: Partial<ProductData>
  isEditing?: boolean
}

const props = defineProps<Props>()

const router = useRouter()
import { useAuthStore } from '@/stores/useAuthStore'
const authStore = useAuthStore()
const currentRole = computed(() => String(authStore.auth?.rol || localStorage.getItem('app-current-role')))

// Reactive Form Data mapping exactly the old Vue 2 layout
const formData = ref<ProductData>({
  categoryId: null,
  reference: '',
  name: '',
  entryValue: 0,
  saleValue: 0,
  amount: 0,
  numberPageManifiests: 0,
  manifiestsId: null,
  amount_count: 0,
  state: true,
  description: '',
  urlImagen: '',
  barCode: ''
})

const categoriesList = ref<any[]>([])
const manifestsList = ref<any[]>([])
const isSubmitting = ref(false)
const isFetchingLists = ref(true)

// Dropzone & Image handling
const fileInput = ref<HTMLInputElement | null>(null)
const fileImage = ref<File | null>(null)
const imageUrlPreview = ref<string>('')
const executedImageEndpoint = ref(false)

// Vue Validation Reference
const formRef = ref()
const barcodeElement = ref(null)

// Watcher to draw 1D Barcode
watch(() => formData.value.barCode, (newVal) => {
  if (newVal && barcodeElement.value) {
    try {
      JsBarcode(barcodeElement.value, newVal, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: false,
        background: "transparent",
        lineColor: "rgba(var(--v-theme-high-emphasis))"
      })
    } catch(e) { /* ignore invalid barcode string states silently while typing */ }
  }
}, { immediate: true, flush: 'post' })

// Currency formatting helpers
const formatCurrency = (value: number | string) => {
  if (!value) return ''
  const num = typeof value === 'string' ? parseFloat(value.replace(/\D/g, '')) : value
  if (isNaN(num)) return ''
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num)
}

const parseCurrency = (value: string) => {
  if (!value) return 0
  return parseInt(value.replace(/\D/g, ''), 10) || 0
}

const formattedEntryValue = computed({
  get: () => formatCurrency(formData.value.entryValue),
  set: (val: string) => {
    formData.value.entryValue = parseCurrency(val)
  }
})

const formattedSaleValue = computed({
  get: () => formatCurrency(formData.value.saleValue),
  set: (val: string) => {
    formData.value.saleValue = parseCurrency(val)
  }
})

// Calculated sale percentages
const calculatedSalePercentage = computed(() => {
  if (formData.value.entryValue && formData.value.saleValue) {
      return (((formData.value.saleValue - formData.value.entryValue) /
      formData.value.entryValue) * 100).toFixed(2)
  }
  return 0
})

// Snackbars
const isSnackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('error')

const requiredValidator = (val: any) => !!val || 'Requerido'

const handleImageClick = () => {
  fileInput.value?.click()
}

const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    fileImage.value = file
    imageUrlPreview.value = URL.createObjectURL(file)
    executedImageEndpoint.value = true
  }
}

const fetchDependencies = async () => {
  try {
    const [categoriesRes, manifestsRes] = await Promise.all([
      $api<any>('/categorie', { params: { size: 500 } }),
      $api<any>('/manifests', { params: { size: 500 } }) // Changed from /manifests/get-all based on old Vue 2 payload
    ])

    if (categoriesRes) {
      // Depending on if Laravel wraps it in pagination 'data', or just returns the array/object
      const rawData = categoriesRes.data || categoriesRes
      categoriesList.value = Array.isArray(rawData) ? rawData : (rawData.data || [])
    }
    
    if (manifestsRes) {
       const rawData = manifestsRes.data || manifestsRes
       manifestsList.value = Array.isArray(rawData) ? rawData : (rawData.data || [])
    }
  } catch (error) {
    console.error('Error fetching dependencies:', error)
  } finally {
    isFetchingLists.value = false
  }
}

const uploadImage = async () => {
  if (!fileImage.value) return null

  const formDataLocal = new FormData()
  formDataLocal.append("image", fileImage.value, fileImage.value.name)

  try {
    const response = await $api<any>('/upload-image', {
      method: 'POST',
      body: formDataLocal,
      params: { product: formData.value.reference } // Matches Vue2 'saveImageProduct' payload params binding
    })
    return response
  } catch (error: any) {
    throw error
  }
}

const submitForm = async () => {
  const { valid } = await formRef.value?.validate()
  if (!valid) return
  
  isSubmitting.value = true
  try {
    let finalImageAws = null

    // Run Image upload FIRST if modified
    if (executedImageEndpoint.value && fileImage.value) {
      const imageResponse = await uploadImage()
      if (imageResponse && !imageResponse.is_error) {
        finalImageAws = imageResponse.msj
      }
    }

    if (props.isEditing) {
      // Legacy PUT expects entirely Spanish keys
      const editPayload: any = {
        id_categoria: formData.value.categoryId, // Ensure we pass the category just in case
        referencia: formData.value.reference,
        nombre: formData.value.name,
        valor_entra: formData.value.entryValue,
        porcentaje_venta: calculatedSalePercentage.value,
        valor_venta: formData.value.saleValue,
        cantidad: formData.value.amount,
        cantidad_contabilidad: formData.value.amount_count,
        manifiestsId: formData.value.manifiestsId || null,
        numberPageManifiests: formData.value.numberPageManifiests ? String(formData.value.numberPageManifiests) : null,
        estado: formData.value.state ? 1 : 0,
        descripcion: formData.value.description,
        codigo_barras: formData.value.barCode,
        imageAwsreal: `https://zabal-app-bucket.s3.amazonaws.com/${formData.value.reference}.jpg`,
        urlImagen: formData.value.urlImagen || ''
      }
      if (finalImageAws) editPayload.imageAws = finalImageAws
      
      const editResponse = await $api(`/product/${formData.value.id}`, { method: 'PUT', body: editPayload })
      if ((editResponse as any).is_error) throw new Error((editResponse as any).message)
    } else {
      // Legacy POST expects exactly the English formData keys (e.g., categoryId, reference, name)
      const createPayload: any = {
        reference: formData.value.reference,
        name: formData.value.name,
        entryValue: formData.value.entryValue,
        saleValue: formData.value.saleValue,
        salePercentage: calculatedSalePercentage.value,
        amount: formData.value.amount,
        description: formData.value.description,
        barCode: formData.value.barCode,
        categoryId: formData.value.categoryId,
        manifiestsId: formData.value.manifiestsId || null,
        amount_count: formData.value.amount_count,
        numberPageManifiests: formData.value.numberPageManifiests ? String(formData.value.numberPageManifiests) : null,
        state: formData.value.state ? 1 : 0,
        imageAwsreal: `https://zabal-app-bucket.s3.amazonaws.com/${formData.value.reference}.jpg`,
        urlImagen: formData.value.urlImagen || ''
      }
      if (finalImageAws) {
        createPayload.imageAws = finalImageAws
        createPayload.urlImagen = `https://zabal-app-bucket.s3.amazonaws.com/${formData.value.reference}.jpg`
        createPayload.imageAwsreal = createPayload.urlImagen
      }
      
      const createResponse = await $api('/product', { method: 'POST', body: createPayload })
      if ((createResponse as any).is_error) throw new Error((createResponse as any).message)
    }

    snackbarMessage.value = props.isEditing ? 'Producto actualizado correctamente' : 'Producto creado correctamente'
    snackbarColor.value = 'success'
    isSnackbarVisible.value = true
    
    // Navigate back to table after success
    setTimeout(() => {
        router.push('/productos')
    }, 1000)

  } catch (error: any) {
    console.error('Error saving product', error)
    snackbarMessage.value = error.response?._data?.message || error.data?.message || 'Error de conexión al guardar el producto'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  } finally {
    isSubmitting.value = false
  }
}

watch(() => props.initialData, (newData) => {
  if (newData) {
    formData.value = { ...formData.value, ...newData }
    if (newData.urlImagen) {
        imageUrlPreview.value = newData.urlImagen
    }
  }
}, { immediate: true, deep: true })

onMounted(() => {
  fetchDependencies()
})
</script>

<template>
  <div class="product-form-container">
    <VOverlay :model-value="isFetchingLists" class="align-center justify-center persistent-overlay" contained>
      <VProgressCircular indeterminate color="primary" size="64" width="6" />
    </VOverlay>

    <VForm
      ref="formRef"
      :disabled="isSubmitting"
      @submit.prevent="submitForm"
    >
      <VRow>
        <!-- Main Column (Left) -->
        <VCol cols="12" md="8">
          
          <!-- Card 1: Información Básica -->
          <VCard title="Información Básica" class="mb-6 elevation-2">
            <VCardText>
              <VRow>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="formData.name"
                    label="Nombre del Producto"
                    placeholder="Ej. Tenis Nike Air Max"
                    :rules="[requiredValidator]"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="formData.reference"
                    label="Referencia (SKU)"
                    placeholder="Ej. REF-X1"
                    :rules="[requiredValidator]"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12">
                  <VTextarea
                    v-model="formData.description"
                    label="Descripción General"
                    placeholder="Agrega una descripción detallada que resalte los beneficios del producto."
                    rows="4"
                    auto-grow
                    :rules="[requiredValidator]"
                    variant="outlined"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Card 2: Precios -->
          <VCard title="Precios / Finanzas" class="mb-6 elevation-2">
            <VCardText>
              <VRow class="align-center py-2">
                <VCol cols="12" md="4">
                  <VTextField
                    v-model="formattedEntryValue"
                    type="text"
                    label="Costo / Valor Entrada"
                    :rules="[requiredValidator]"
                    variant="outlined"
                    :disabled="currentRole === '2'"
                  />
                </VCol>
                
                <VCol cols="12" md="4" class="text-center border-x-dashed">
                  <VChip
                    color="primary"
                    variant="tonal"
                    size="x-large"
                    class="font-weight-bold px-6 py-4"
                  >
                    Margen: {{ calculatedSalePercentage }}%
                  </VChip>
                  <p class="text-caption text-disabled mt-2 mb-0">Calculado automáticamente</p>
                </VCol>

                <VCol cols="12" md="4">
                  <VTextField
                    v-model="formattedSaleValue"
                    type="text"
                    label="Precio Sugerido Venta"
                    :rules="[requiredValidator]"
                    variant="outlined"
                    :disabled="currentRole === '2'"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Card 3: Inventario y Logística -->
          <VCard title="Inventario y Logística" class="elevation-2">
            <VCardText>
              <VRow>
                <VCol cols="12" md="6">
                  <VSelect
                    v-model="formData.categoryId"
                    :items="categoriesList"
                    item-title="nombre"
                    item-value="id"
                    label="Categoría del Producto"
                    :rules="[requiredValidator]"
                    variant="outlined"
                    prepend-inner-icon="tabler-category"
                  />
                </VCol>
                
                <VCol cols="12" md="3">
                  <VTextField
                    v-model.number="formData.amount"
                    label="Stock Sistema"
                    type="number"
                    :rules="[requiredValidator]"
                    variant="outlined"
                  />
                </VCol>
                
                <VCol cols="12" md="3">
                  <VTextField
                    v-model.number="formData.amount_count"
                    label="Stock Contable"
                    type="number"
                    :rules="[requiredValidator]"
                    variant="outlined"
                  />
                </VCol>
                
                <VCol cols="12">
                   <VDivider class="my-4" />
                   <p class="text-subtitle-2 font-weight-medium mb-4 text-disabled">TRAZABILIDAD (Opcional)</p>
                </VCol>

                <VCol cols="12" md="6">
                  <VSelect
                    v-model="formData.manifiestsId"
                    :items="manifestsList"
                    item-title="nombre"
                    item-value="id"
                    label="Asignar a Manifiesto activo"
                    variant="outlined"
                    prepend-inner-icon="tabler-clipboard-list"
                  />
                </VCol>

                <VCol cols="12" md="6">
                  <VTextField
                    v-model="formData.numberPageManifiests"
                    label="Número de Página (Manifiesto)"
                    type="text"
                    variant="outlined"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

        </VCol>

        <!-- Sidebar Column (Right) -->
        <VCol cols="12" md="4">

          <!-- Card 4: Imagen principal -->
          <VCard title="Media Fotográfica" class="mb-6 elevation-2">
            <VCardText class="d-flex flex-column align-center text-center">
              <div 
                class="image-upload-zone cursor-pointer rounded-circle overflow-hidden mb-6 d-flex align-center justify-center elevation-3" 
                @click="handleImageClick"
                style="width: 200px; height: 200px; border: 4px solid rgba(var(--v-theme-primary), 0.1); background-color: rgba(var(--v-theme-primary), 0.03); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);"
              >
                <VImg 
                  v-if="imageUrlPreview" 
                  :src="imageUrlPreview" 
                  cover 
                  class="w-100 h-100 object-fit-cover" 
                />
                <div v-else class="text-center text-primary mt-3">
                  <VIcon icon="tabler-photo-plus" size="52" class="mb-2 opacity-80" />
                  <p class="mb-0 text-caption font-weight-bold mx-2">Toca para subir<br>foto principal</p>
                </div>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="d-none"
                  @change="handleImageChange"
                />
              </div>
              <p class="text-caption text-disabled px-2">
                 Establece la imagen destacada cuadrada para mostrar este producto. Formatos: JPG, PNG, WEBP.
              </p>
            </VCardText>
          </VCard>

          <!-- Card 5: Organización / Estado / Código Barras -->
          <VCard title="Organización" class="elevation-2">
            <VCardText>
               <div class="d-flex align-center justify-space-between mb-6 pa-5 rounded bg-light-primary" style="background-color: rgba(var(--v-theme-primary), 0.04); border: 1px solid rgba(var(--v-theme-primary), 0.1);">
                  <div class="d-flex flex-column">
                    <span class="text-subtitle-1 font-weight-bold text-high-emphasis">Visibilidad</span>
                    <span class="text-caption text-disabled">Estado en tienda</span>
                  </div>
                  <VSwitch
                    v-model="formData.state"
                    color="success"
                    inset
                    :label="formData.state ? 'Activo' : 'Inactivo'"
                    hide-details
                    class="font-weight-medium"
                  />
               </div>

               <VDivider class="mb-6"/>

               <VTextField
                  v-model="formData.barCode"
                  label="Código EAN / UPC"
                  placeholder="Escanea o teclea"
                  :rules="[requiredValidator]"
                  prepend-inner-icon="tabler-barcode"
                  variant="outlined"
                  class="mb-5"
                />
                
                <VScaleTransition>
                  <div 
                    v-if="formData.barCode"
                    class="d-flex align-center justify-center rounded py-6 elevation-1 bg-surface"
                    style="border: 2px dashed rgba(var(--v-theme-primary), 0.5); overflow: hidden;"
                  >
                      <div class="text-center w-100">
                          <svg ref="barcodeElement" class="w-100 px-4" style="max-height: 80px;"></svg>
                          <div class="text-subtitle-1 font-weight-black text-high-emphasis letter-spacing-1 mt-2">{{ formData.barCode }}</div>
                      </div>
                  </div>
                </VScaleTransition>
            </VCardText>
          </VCard>

        </VCol>
      </VRow>

      <!-- Global Actions (Bottom Fixed or Normal) -->
      <div class="d-flex justify-end gap-x-4 mt-8 pt-4 pb-2 border-t">
        <VBtn
          color="error"
          variant="tonal"
          class="px-6"
          :disabled="isSubmitting"
          @click="router.push('/productos')"
        >
          Cancelar
        </VBtn>
        <VBtn
          type="submit"
          color="primary"
          variant="elevated"
          class="px-8 shadow-primary"
          :loading="isSubmitting"
          prepend-icon="tabler-device-floppy"
        >
          {{ props.isEditing ? 'Guardar Cambios' : 'Publicar Producto' }}
        </VBtn>
      </div>

    </VForm>

    <VSnackbar
      v-model="isSnackbarVisible"
      :color="snackbarColor"
      location="top right"
      :timeout="4000"
      elevation="24"
    >
      <div class="d-flex align-center gap-x-2">
        <VIcon :icon="snackbarColor === 'success' ? 'tabler-circle-check-filled' : 'tabler-alert-circle-filled'" size="24" />
        <span class="text-body-1 font-weight-medium">{{ snackbarMessage }}</span>
      </div>
      <template #actions>
        <VBtn color="white" variant="text" icon="tabler-x" rounded @click="isSnackbarVisible = false"/>
      </template>
    </VSnackbar>
  </div>
</template>

<style scoped>
.product-form-container {
  position: relative;
}
.image-upload-zone:hover {
  border-color: rgba(var(--v-theme-primary), 0.6) !important;
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
  transform: scale(1.03);
  box-shadow: 0 10px 20px rgba(var(--v-theme-primary), 0.15) !important;
}
.shadow-primary {
  box-shadow: 0 4px 14px 0 rgba(var(--v-theme-primary), 0.39) !important;
}
.border-x-dashed {
  border-left: 2px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-right: 2px dashed rgba(var(--v-border-color), var(--v-border-opacity));
}
.letter-spacing-1 {
  letter-spacing: 2px !important;
}
</style>
