<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { $api } from '@/utils/api'

definePage({
  meta: {
    navActiveLink: 'QuotesList',
  },
})

const route = useRoute()
const router = useRouter()

// Auth
const user = computed(() => {
  try { return JSON.parse(localStorage.getItem('userData') || '{}') } catch { return {} }
})
const isAdmin = computed(() => ['1', '2'].includes(String(user.value?.rol)))

// Mode — always edit mode in this route
const isEditMode = true
const pageTitle = 'Editar Cotización'
const routeId = computed(() => (route.params as any).id as string)

// Quote data
const quote = ref({
  id_usuario: null as number | null,
  reference: 'CO-##',
  date: '',
  customer: null as any,
  store: null as any,
  products: [] as any[],
  total: 0,
  description: '',
  creation: false,
})

// Customer search
const customerSearchQuery = ref('')
const customerResults = ref<any[]>([])
const customerSearchLoading = ref(false)
const customerDebounce = ref<ReturnType<typeof setTimeout> | null>(null)
const customerStores = ref<any[]>([])

// Product search
const productSearchQuery = ref('')
const productResults = ref<any[]>([])
const productSearchLoading = ref(false)
const productDebounce = ref<ReturnType<typeof setTimeout> | null>(null)

// Loading & submission
const isLoading = ref(false)
const isSubmitting = ref(false)

// Snackbar
const isSnackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('error')

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

// Customer logic
const searchCustomers = async (query: string) => {
  if (!query || query.length < 2) { customerResults.value = []; return }
  customerSearchLoading.value = true
  try {
    const response = await $api<any>('/client/client-search', { params: { input: query } })
    customerResults.value = response?.data || []
  } catch { customerResults.value = [] }
  finally { customerSearchLoading.value = false }
}

const onCustomerSearchInput = (val: string) => {
  customerSearchQuery.value = val
  if (customerDebounce.value) clearTimeout(customerDebounce.value)
  customerDebounce.value = setTimeout(() => searchCustomers(val), 300)
}

const selectCustomer = (customer: any) => {
  quote.value.customer = customer
  customerSearchQuery.value = customer.nombre
  customerStores.value = customer.almacenes || []
  quote.value.store = null
  customerResults.value = []
}

const clearCustomer = () => {
  quote.value.customer = null
  customerSearchQuery.value = ''
  customerStores.value = []
  quote.value.store = null
}

// Product logic
const searchProducts = async (query: string) => {
  if (!query || query.length < 2) { productResults.value = []; return }
  productSearchLoading.value = true
  try {
    const response = await $api<any>('/product/product-search', { params: { input: query, state: 1 } })
    productResults.value = response?.data || []
  } catch { productResults.value = [] }
  finally { productSearchLoading.value = false }
}

const onProductSearchInput = (val: string) => {
  productSearchQuery.value = val
  if (productDebounce.value) clearTimeout(productDebounce.value)
  productDebounce.value = setTimeout(() => searchProducts(val), 300)
}

const addProduct = (product: any) => {
  if (quote.value.products.find((p: any) => p.id === product.id)) {
    showMsg('Este producto ya está en la lista', 'warning'); productSearchQuery.value = ''; productResults.value = []; return
  }
  if (product.cantidad <= 0) {
    showMsg(`${product.nombre} no tiene unidades en inventario`, 'warning'); productSearchQuery.value = ''; productResults.value = []; return
  }
  quote.value.products.unshift({ ...product, cantidad_cotizacion: 1, valor_unidad: product.valor_venta, valor_total: product.valor_venta })
  recalculateTotal(); productSearchQuery.value = ''; productResults.value = []
}

const removeProduct = (index: number) => { quote.value.products.splice(index, 1); recalculateTotal() }
const onQuantityChange = (product: any) => { product.valor_total = product.cantidad_cotizacion * product.valor_unidad; recalculateTotal() }
const onPriceChange = (product: any) => { product.valor_venta = product.valor_unidad; product.valor_total = product.cantidad_cotizacion * product.valor_unidad; recalculateTotal() }
const recalculateTotal = () => { quote.value.total = quote.value.products.reduce((sum: number, p: any) => sum + (p.valor_total || 0), 0) }

const productHeaders = [
  { title: '#', key: 'index', width: '50px', align: 'center' as const, sortable: false },
  { title: 'Referencia', key: 'referencia', width: '130px', sortable: false },
  { title: 'Descripción', key: 'nombre', sortable: false },
  { title: 'Cantidad', key: 'cantidad_cotizacion', width: '130px', align: 'center' as const, sortable: false },
  { title: 'Valor Unidad', key: 'valor_unidad', width: '160px', sortable: false },
  { title: 'Valor Total', key: 'valor_total', width: '150px', sortable: false },
  { title: '', key: 'remove', width: '60px', sortable: false },
]

// Save (update)
const saveQuote = async () => {
  if (!quote.value.date) { showMsg('Ingrese la fecha', 'error'); return }
  if (!quote.value.customer) { showMsg('Seleccione un cliente', 'error'); return }
  if (!quote.value.store) { showMsg('Seleccione un almacén', 'error'); return }
  if (quote.value.products.length === 0) { showMsg('Agregue al menos un producto', 'error'); return }

  isSubmitting.value = true
  try {
    const response = await $api<any>(`/quote/${routeId.value}`, {
      method: 'PUT',
      body: { id: routeId.value, ...quote.value },
    })
    if (response?.is_error) { showMsg(response.message || 'Error al actualizar', 'error'); return }
    showMsg('Cotización actualizada correctamente', 'success')
    setTimeout(() => router.push('/cotizaciones'), 800)
  } catch (error: any) {
    showMsg(error.data?.message || 'Error de conexión', 'error')
  } finally { isSubmitting.value = false }
}

// Load quote
const loadQuote = async (id: string) => {
  isLoading.value = true
  try {
    const response = await $api<any>(`/quote/${id}`)
    console.log('📦 Quote API response:', response)

    // The API returns { data: { referencia, fecha, cliente, almacen, productos, ... } }
    const quoteData = response?.data || response
    if (quoteData) {
      quote.value = {
        id_usuario: user.value?.id,
        reference: quoteData.referencia,
        date: quoteData.fecha,
        customer: quoteData.cliente,
        store: quoteData.almacen,
        products: (quoteData.productos || []).map((item: any) => {
          const prod = item.producto || item
          return {
            ...prod,
            id_cotizacion_producto: item.id,
            cantidad_cotizacion: item.cantidad_cotizacion,
            valor_unidad: item.valor_unidad,
            valor_total: item.valor_total,
          }
        }),
        total: quoteData.total,
        description: quoteData.descripcion || '',
        creation: quoteData.created_at,
      }

      // Set customer search field
      const customer = quoteData.cliente
      customerSearchQuery.value = customer?.nombre || ''

      // Load customer stores (almacenes) from customer endpoint
      if (customer?.id) {
        try {
          const customerResponse = await $api<any>(`/client/${customer.id}`)
          console.log('👤 Customer API response:', customerResponse)
          const customerData = customerResponse?.data || customerResponse
          customerStores.value = customerData?.almacenes || []
        } catch (e) {
          console.error('Error loading customer stores:', e)
          customerStores.value = []
        }
      }
    }
  } catch (e) {
    console.error('Error loading quote:', e)
    showMsg('Error al cargar la cotización', 'error')
  } finally {
    isLoading.value = false
  }
}

const showMsg = (msg: string, color: string) => { snackbarMessage.value = msg; snackbarColor.value = color; isSnackbarVisible.value = true }
const goBack = () => router.push('/cotizaciones')

onMounted(async () => {
  quote.value.id_usuario = user.value?.id || null
  if (routeId.value) await loadQuote(routeId.value)
})
</script>

<template>
  <div>
    <VOverlay :model-value="isLoading" class="align-center justify-center" persistent>
      <VProgressCircular indeterminate color="primary" size="64" />
    </VOverlay>

    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <VBtn icon="tabler-arrow-left" variant="text" size="small" color="secondary" @click="goBack" />
          <h4 class="text-h4 font-weight-bold">{{ pageTitle }}</h4>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0 ms-10">Complete la información para actualizar la cotización</p>
      </div>
    </div>

    <!-- General Info -->
    <VCard class="mb-6">
      <VCardTitle class="d-flex align-center gap-2 pa-5 pb-3">
        <VIcon icon="tabler-info-circle" size="22" color="primary" />
        Información General
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12" md="6">
            <VTextField v-model="quote.reference" label="Referencia" disabled prepend-inner-icon="tabler-hash" variant="outlined" />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField v-model="quote.date" label="Fecha de cotización" type="date" prepend-inner-icon="tabler-calendar" variant="outlined" />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Client + Store -->
    <VRow class="mb-6">
      <VCol cols="12" md="6">
        <VCard class="h-100">
          <VCardTitle class="d-flex align-center gap-2 pa-5 pb-3">
            <VIcon icon="tabler-user" size="22" color="primary" />
            Información del Cliente
          </VCardTitle>
          <VDivider />
          <VCardText>
            <VAutocomplete
              :model-value="customerSearchQuery"
              :items="customerResults"
              :loading="customerSearchLoading"
              item-title="nombre" item-value="id"
              label="Buscar cliente..." placeholder="Nombre o identificación"
              prepend-inner-icon="tabler-search" variant="outlined" no-filter return-object clearable hide-no-data density="compact" class="mb-4"
              @update:search="onCustomerSearchInput"
              @update:model-value="(val: any) => { if (val && typeof val === 'object') selectCustomer(val) }"
              @click:clear="clearCustomer"
            >
              <template #item="{ item, props: itemProps }">
                <VListItem v-bind="itemProps">
                  <template #prepend>
                    <VAvatar color="primary" variant="tonal" size="36">
                      <span class="text-caption font-weight-bold">{{ item.raw.nombre?.charAt(0)?.toUpperCase() }}</span>
                    </VAvatar>
                  </template>
                  <VListItemTitle>{{ item.raw.nombre }}</VListItemTitle>
                  <VListItemSubtitle>{{ item.raw.identificacion }} • {{ item.raw.celular }}</VListItemSubtitle>
                </VListItem>
              </template>
            </VAutocomplete>
            <VExpandTransition>
              <div v-if="quote.customer && typeof quote.customer === 'object'">
                <VCard variant="outlined" class="pa-4 mt-2 bg-grey-50" style="border-color: rgba(var(--v-theme-primary), 0.2)">
                  <div class="d-flex flex-column gap-2">
                    <div class="d-flex align-center gap-2"><VIcon icon="tabler-id" size="18" color="primary" /><span class="text-caption text-medium-emphasis">Identificación:</span><span class="font-weight-medium">{{ quote.customer.identificacion }}</span></div>
                    <div class="d-flex align-center gap-2"><VIcon icon="tabler-user" size="18" color="primary" /><span class="text-caption text-medium-emphasis">Nombre:</span><span class="font-weight-medium">{{ quote.customer.nombre }}</span></div>
                    <div class="d-flex align-center gap-2"><VIcon icon="tabler-mail" size="18" color="primary" /><span class="text-caption text-medium-emphasis">Correo:</span><span class="font-weight-medium">{{ quote.customer.correo || 'N/A' }}</span></div>
                    <div class="d-flex align-center gap-2"><VIcon icon="tabler-phone" size="18" color="primary" /><span class="text-caption text-medium-emphasis">Teléfono:</span><span class="font-weight-medium">{{ quote.customer.telefono_fijo || 'N/A' }}</span></div>
                    <div class="d-flex align-center gap-2"><VIcon icon="tabler-device-mobile" size="18" color="primary" /><span class="text-caption text-medium-emphasis">Celular:</span><span class="font-weight-medium">{{ quote.customer.celular || 'N/A' }}</span></div>
                  </div>
                </VCard>
              </div>
            </VExpandTransition>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard class="h-100">
          <VCardTitle class="d-flex align-center gap-2 pa-5 pb-3">
            <VIcon icon="tabler-building-store" size="22" color="primary" />
            Información del Almacén
          </VCardTitle>
          <VDivider />
          <VCardText>
            <VSelect v-model="quote.store" :items="customerStores" item-title="nombre" return-object label="Seleccione un almacén" placeholder="Primero seleccione un cliente" prepend-inner-icon="tabler-building" variant="outlined" density="compact" class="mb-4" :disabled="!quote.customer" />
            <VExpandTransition>
              <div v-if="quote.store && typeof quote.store === 'object'">
                <VCard variant="outlined" class="pa-4 mt-2 bg-grey-50" style="border-color: rgba(var(--v-theme-primary), 0.2)">
                  <div class="d-flex flex-column gap-2">
                    <div class="d-flex align-center gap-2"><VIcon icon="tabler-id" size="18" color="primary" /><span class="text-caption text-medium-emphasis">NIT:</span><span class="font-weight-medium">{{ quote.store.nit }}</span></div>
                    <div class="d-flex align-center gap-2"><VIcon icon="tabler-building-store" size="18" color="primary" /><span class="text-caption text-medium-emphasis">Nombre:</span><span class="font-weight-medium">{{ quote.store.nombre }}</span></div>
                    <div class="d-flex align-center gap-2"><VIcon icon="tabler-user-check" size="18" color="primary" /><span class="text-caption text-medium-emphasis">Encargado:</span><span class="font-weight-medium">{{ quote.store.encargado }}</span></div>
                    <div class="d-flex align-center gap-2"><VIcon icon="tabler-map-pin" size="18" color="primary" /><span class="text-caption text-medium-emphasis">Ciudad:</span><span class="font-weight-medium">{{ quote.store.ciudad || 'N/A' }}</span></div>
                    <div class="d-flex align-center gap-2"><VIcon icon="tabler-phone" size="18" color="primary" /><span class="text-caption text-medium-emphasis">Teléfono:</span><span class="font-weight-medium">{{ quote.store.telefono || 'N/A' }}</span></div>
                    <div class="d-flex align-center gap-2"><VIcon icon="tabler-map" size="18" color="primary" /><span class="text-caption text-medium-emphasis">Dirección:</span><span class="font-weight-medium">{{ quote.store.direccion || 'N/A' }}</span></div>
                  </div>
                </VCard>
              </div>
            </VExpandTransition>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Products -->
    <VCard class="mb-6">
      <VCardTitle class="d-flex align-center gap-2 pa-5 pb-3">
        <VIcon icon="tabler-package" size="22" color="primary" />
        Productos
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VAutocomplete
          :model-value="productSearchQuery" :items="productResults" :loading="productSearchLoading"
          item-title="nombre" item-value="id" label="Buscar producto por nombre, referencia o código de barras"
          placeholder="Escriba para buscar..." prepend-inner-icon="tabler-search" variant="outlined"
          no-filter return-object clearable hide-no-data density="compact" class="mb-4"
          @update:search="onProductSearchInput"
          @update:model-value="(val: any) => { if (val && typeof val === 'object') addProduct(val) }"
        >
          <template #item="{ item, props: itemProps }">
            <VListItem v-bind="itemProps">
              <template #prepend>
                <VAvatar color="secondary" variant="tonal" size="36"><VIcon icon="tabler-package" size="20" /></VAvatar>
              </template>
              <VListItemTitle>{{ item.raw.nombre }}</VListItemTitle>
              <VListItemSubtitle class="d-flex align-center gap-2">
                <span>{{ item.raw.referencia }}</span>
                <VChip :color="item.raw.cantidad >= 10 ? 'success' : 'error'" size="x-small" variant="flat" class="font-weight-medium px-2">Stock: {{ item.raw.cantidad }}</VChip>
                <span class="text-primary font-weight-bold">{{ formatCurrency(item.raw.valor_venta) }}</span>
              </VListItemSubtitle>
            </VListItem>
          </template>
        </VAutocomplete>

        <VDataTable :headers="productHeaders" :items="quote.products" density="compact" class="text-body-2" :items-per-page="-1" hide-default-footer>
          <template #item.index="{ index }"><span class="text-medium-emphasis">{{ index + 1 }}</span></template>
          <template #item.referencia="{ item }"><span class="font-weight-medium">{{ item.referencia }}</span></template>
          <template #item.nombre="{ item }"><div style="min-width: 180px; white-space: normal;"><span>{{ item.nombre }}</span></div></template>
          <template #item.cantidad_cotizacion="{ item }">
            <VTextField v-model.number="item.cantidad_cotizacion" type="number" density="compact" variant="outlined" hide-details :min="1" style="width: 90px;" @blur="onQuantityChange(item)" />
          </template>
          <template #item.valor_unidad="{ item }">
            <VTextField v-model.number="item.valor_unidad" type="number" density="compact" variant="outlined" hide-details :min="1" :disabled="!isAdmin" style="width: 130px;" prefix="$" @blur="onPriceChange(item)" />
          </template>
          <template #item.valor_total="{ item }"><span class="font-weight-bold text-primary">{{ formatCurrency(item.valor_total) }}</span></template>
          <template #item.remove="{ index }"><IconBtn color="error" @click="removeProduct(index)"><VIcon icon="tabler-trash" size="20" /></IconBtn></template>
          <template #no-data>
            <div class="text-center py-8">
              <VIcon icon="tabler-package-off" size="48" color="secondary" class="mb-2" />
              <p class="text-medium-emphasis text-body-1 mb-0">No hay productos. Use el buscador para agregar productos.</p>
            </div>
          </template>
        </VDataTable>
      </VCardText>
      <VDivider />
      <VCardText class="d-flex align-center justify-end pa-5">
        <VCard variant="tonal" color="primary" class="d-flex align-center gap-4 px-6 py-4 rounded-lg">
          <span class="text-h6 font-weight-bold">TOTAL</span>
          <span class="text-h3 font-weight-bold">{{ formatCurrency(quote.total) }}</span>
        </VCard>
      </VCardText>
    </VCard>

    <!-- Description -->
    <VCard class="mb-6">
      <VCardTitle class="d-flex align-center gap-2 pa-5 pb-3">
        <VIcon icon="tabler-notes" size="22" color="primary" />
        Descripción
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VTextarea v-model="quote.description" placeholder="Notas o descripción adicional..." rows="3" auto-grow variant="outlined" />
      </VCardText>
    </VCard>

    <!-- Actions -->
    <div class="d-flex justify-end gap-4">
      <VBtn color="secondary" variant="tonal" prepend-icon="tabler-x" :disabled="isSubmitting" @click="goBack">Cancelar</VBtn>
      <VBtn color="primary" prepend-icon="tabler-device-floppy" :loading="isSubmitting" :disabled="isSubmitting" size="large" @click="saveQuote">Actualizar Cotización</VBtn>
    </div>

    <VSnackbar v-model="isSnackbarVisible" :color="snackbarColor" location="top end" :timeout="3000">
      {{ snackbarMessage }}
      <template #actions><VBtn color="white" variant="text" icon="tabler-x" @click="isSnackbarVisible = false" /></template>
    </VSnackbar>
  </div>
</template>
