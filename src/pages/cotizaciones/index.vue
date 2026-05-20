<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import { $api } from '@/utils/api'

definePage({
  name: 'QuotesList',
})

// Auth
const user = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('userData') || '{}')
  } catch { return {} }
})

const isAdmin = computed(() => ['1', '2', '3'].includes(String(user.value?.rol)))

// Data
const tableData = ref<any[]>([])
const totalData = ref(0)
const isLoading = ref(false)

// Pagination
const options = ref({ page: 1, itemsPerPage: 50, sortBy: [], groupBy: [], search: undefined })
const itemsPerPageOptions = [50, 100, 150, 200, 500]

// Search
const searchQuery = ref('')
const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Headers
const headers = computed(() => {
  const base: any[] = [
    { title: 'Est', key: 'facturado', width: '50px', align: 'center' as const },
    { title: 'Ref', key: 'referencia', width: '90px' },
    { title: 'Fecha', key: 'fecha', width: '100px' },
    { title: 'Almacén', key: 'almacen' },
    { title: 'Celular', key: 'cliente', width: '120px' },
    { title: 'Total', key: 'total', width: '130px' },
    { title: 'Vendedor', key: 'encargado', width: '120px' },
  ]
  if (isAdmin.value) {
    base.push({ title: 'Facturar', key: 'invoice', width: '180px', align: 'center' })
  }
  base.push({ title: 'Acciones', key: 'actions', sortable: false, width: '140px', align: 'center' })
  return base as any[]
})

// Dialogs
const confirmDeleteDialog = ref<InstanceType<typeof AppConfirmDialog> | null>(null)
const confirmInvoiceDialog = ref<InstanceType<typeof AppConfirmDialog> | null>(null)
const confirmEditInvoicedDialog = ref<InstanceType<typeof AppConfirmDialog> | null>(null)
const itemToDelete = ref<number | null>(null)
const itemToInvoice = ref<any>(null)
const itemToInvoiceIndex = ref<number>(-1)
const invoicedEditId = ref<number | null>(null)

// Print dialog
const showPrintDialog = ref(false)
const printData = ref<any>(null)

// Snackbar
const isSnackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

// Fetch
const fetchQuotes = async () => {
  isLoading.value = true
  try {
    const params: any = {
      size: options.value.itemsPerPage,
      page: options.value.page,
    }

    // Restrict to user's quotes if not admin
    if (!isAdmin.value && user.value?.id) {
      params.id_usuario = user.value.id
    }

    const response = await $api<any>('/quote', { params })

    if (response?.data?.data) {
      tableData.value = response.data.data
      totalData.value = response.data.total || 0
    } else if (response?.is_error) {
      tableData.value = []
      showError(response.message || 'Error al cargar cotizaciones')
    }
  } catch (error: any) {
    showError(error.data?.message || 'Error de conexión')
  } finally {
    isLoading.value = false
  }
}

const searchQuotes = async () => {
  if (!searchQuery.value.trim()) {
    fetchQuotes()
    return
  }
  isLoading.value = true
  try {
    const params: any = {
      input: searchQuery.value,
      size: options.value.itemsPerPage,
      page: options.value.page,
    }
    const response = await $api<any>('/quote/quote-search', { params })

    if (response?.data) {
      tableData.value = response.data
      totalData.value = response.total || response.data?.length || 0
    }
  } catch (error: any) {
    showError(error.data?.message || 'Error de conexión')
  } finally {
    isLoading.value = false
  }
}

const onSearchInput = () => {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  debounceTimer.value = setTimeout(() => {
    options.value.page = 1
    if (searchQuery.value.trim()) {
      searchQuotes()
    } else {
      fetchQuotes()
    }
  }, 600)
}

// Actions
const router = useRouter()

const createQuote = () => {
  router.push('/cotizaciones/gestionar')
}

const editQuote = (id: number, facturado: number) => {
  if (facturado) {
    invoicedEditId.value = id
    confirmEditInvoicedDialog.value?.open()
  } else {
    router.push(`/cotizaciones/gestionar/${id}`)
  }
}

const executeEditInvoiced = () => {
  if (invoicedEditId.value) {
    router.push(`/cotizaciones/gestionar/${invoicedEditId.value}`)
  }
}

const confirmDelete = (id: number) => {
  itemToDelete.value = id
  confirmDeleteDialog.value?.open()
}

const executeDelete = async () => {
  if (!itemToDelete.value) return
  try {
    const response = await $api<any>(`/quote/${itemToDelete.value}`, { method: 'DELETE' })
    if (response?.status === 405 || response?.data?.status === 405) {
      showError(response.data?.message || response?.message || 'No se puede eliminar esta cotización')
      return
    }
    showSuccess('Cotización eliminada exitosamente')
    fetchQuotes()
  } catch (error: any) {
    if (error?.response?.status === 405 || error?.statusCode === 405) {
      showError(error.data?.message || 'No se puede eliminar esta cotización')
    } else {
      showError(error.data?.message || 'Error al eliminar')
    }
  } finally {
    itemToDelete.value = null
  }
}

const confirmInvoice = (item: any, index: number) => {
  itemToInvoice.value = item
  itemToInvoiceIndex.value = index
  confirmInvoiceDialog.value?.open()
}

const executeInvoice = async () => {
  if (!itemToInvoice.value) return
  try {
    const response = await $api<any>('/quote', {
      method: 'PUT',
      body: itemToInvoice.value,
    })
    if (response?.is_error || response?.data?.is_error) {
      showError(response?.message || response?.data?.message || 'Error al facturar')
      return
    }
    // Update local table
    const idx = tableData.value.findIndex(q => q.id === itemToInvoice.value.id)
    if (idx !== -1) {
      tableData.value[idx].facturado = 1
    }
    showSuccess('Cotización facturada correctamente')
  } catch (error: any) {
    showError(error.data?.message || 'Error al facturar')
  } finally {
    itemToInvoice.value = null
  }
}

const printQuote = (item: any) => {
  printData.value = item
  showPrintDialog.value = true
}

const executePrint = () => {
  if (!printData.value) return
  // Build the print HTML
  const data = printData.value
  const products = data.productos || []
  const productRows = products.map((p: any, i: number) => {
    const prod = p.producto || p
    return `<tr>
      <td style="border-bottom:1px solid #e0e0e0;padding:8px;color:#333">${i + 1}</td>
      <td style="border-bottom:1px solid #e0e0e0;padding:8px;color:#333">${prod.referencia || ''}</td>
      <td style="border-bottom:1px solid #e0e0e0;padding:8px;color:#333">${prod.nombre || ''}</td>
      <td style="border-bottom:1px solid #e0e0e0;padding:8px;color:#333;text-align:center">${p.cantidad_cotizacion || prod.cantidad_cotizacion || prod.cantidad || ''}</td>
      <td style="border-bottom:1px solid #e0e0e0;padding:8px;color:#333;text-align:right">${formatCurrency(p.valor_unidad || prod.valor_unidad || 0)}</td>
      <td style="border-bottom:1px solid #e0e0e0;padding:8px;color:#333;text-align:right;font-weight:bold">${formatCurrency(p.valor_total || prod.valor_total || 0)}</td>
    </tr>`
  }).join('')

  const html = `<html><head><title>Cotización ${data.referencia}</title>
    <style>body{font-family:Arial,sans-serif;color:#333;margin:0;padding:20px}
    @media print{body{padding:0}}</style></head><body>
    <div style="text-align:center;margin-bottom:20px">
      <h1 style="color:#331791;margin:5px 0;font-size:1.8rem">T|L</h1>
      <h2 style="margin:5px 0;font-size:1.4rem">TECHLOVERS STORE</h2>
      <p style="margin:2px 0;color:#666">BODEGA TECHLOVERS STORE</p>
      <p style="margin:2px 0;color:#331791">3206394403 - 3187155292</p>
    </div>
    <div style="display:flex;justify-content:space-between;margin:20px auto;width:85%">
      <div style="width:48%">
        <p style="margin:4px 0"><strong style="color:#331791">Fecha:</strong> ${data.fecha}</p>
        <p style="margin:4px 0"><strong style="color:#331791">Referencia:</strong> ${data.referencia}</p>
        <p style="margin:4px 0"><strong style="color:#331791">Cliente:</strong> ${data.cliente?.nombre || 'N/A'}</p>
        <p style="margin:4px 0"><strong style="color:#331791">Almacén:</strong> ${data.almacen?.nombre || 'N/A'}</p>
        <p style="margin:4px 0"><strong style="color:#331791">Encargado:</strong> ${data.almacen?.encargado || 'N/A'}</p>
      </div>
      <div style="width:48%">
        <p style="margin:4px 0"><strong style="color:#331791">Ciudad:</strong> ${data.almacen?.ciudad || 'N/A'}</p>
        <p style="margin:4px 0"><strong style="color:#331791">Barrio:</strong> ${data.almacen?.barrio || 'N/A'}</p>
        <p style="margin:4px 0"><strong style="color:#331791">Dirección:</strong> ${data.almacen?.direccion || 'N/A'}</p>
        <p style="margin:4px 0"><strong style="color:#331791">Teléfono:</strong> ${data.almacen?.telefono || 'N/A'}</p>
        <p style="margin:4px 0"><strong style="color:#331791">Vendedor:</strong> ${data.encargado?.name || 'N/A'}</p>
      </div>
    </div>
    <table style="width:85%;margin:20px auto;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#331791;color:white">
          <th style="padding:10px;text-align:left">ITEM</th>
          <th style="padding:10px;text-align:left">REFERENCIA</th>
          <th style="padding:10px;text-align:left">DESCRIPCIÓN</th>
          <th style="padding:10px;text-align:center">CANT.</th>
          <th style="padding:10px;text-align:right">VALOR U.</th>
          <th style="padding:10px;text-align:right">TOTAL</th>
        </tr>
      </thead>
      <tbody>${productRows}</tbody>
    </table>
    <div style="width:85%;margin:15px auto;border:2px solid #331791;padding:12px;display:flex;justify-content:space-between;align-items:center;border-radius:6px">
      <span style="font-size:1.3rem;color:#331791;font-weight:bold">TOTAL</span>
      <span style="font-size:1.3rem;font-weight:bold">${formatCurrency(data.total)}</span>
    </div>
    <div style="width:85%;margin:15px auto">
      <p><strong>Descripción:</strong> ${data.descripcion || ''}</p>
    </div>
    <div style="width:85%;margin:15px auto;display:flex;justify-content:space-between;gap:20px;font-size:13px">
      <div style="width:48%">
        <p style="margin:4px 0">NOTA: <span>PARA REALIZAR PAGOS FAVOR LLAMAR AL # <b>3187155292</b> O AL <b>3206394403</b></span></p>
        <p style="margin:4px 0;color:red;font-size:12px">PASADOS LOS 45 DIAS LA FACTURA NO APLICA DESCUENTO</p>
      </div>
      <div style="width:48%">
        <p style="margin:4px 0"><b style="text-decoration:underline">ÚNICAS CUENTAS AUTORIZADAS</b></p>
        <p style="margin:4px 0"><b>Confirmar antes de realizar el pago</b></p>
        <p style="margin:4px 0"><b>#95976272316</b> AHORROS BANCOLOMBIA SERGIO GIRALDO</p>
        <p style="margin:4px 0"><b>#01400015399</b> AHORROS BANCOLOMBIA OMAR ARISTIZABAL</p>
      </div>
    </div>
    <div style="width:85%;margin:40px auto;display:flex;justify-content:space-between">
      <p>Despacho: __________________________</p>
      <p>Recibe: _____________________________</p>
    </div>
  </body></html>`

  const printWin = window.open('', '_blank', '')
  if (printWin) {
    printWin.document.write(html)
    printWin.document.close()
    printWin.print()
  }
  showPrintDialog.value = false
}

// Helpers
const showSuccess = (msg: string) => {
  snackbarMessage.value = msg
  snackbarColor.value = 'success'
  isSnackbarVisible.value = true
}

const showError = (msg: string) => {
  snackbarMessage.value = msg
  snackbarColor.value = 'error'
  isSnackbarVisible.value = true
}

// Watchers
watch([() => options.value.page, () => options.value.itemsPerPage], () => {
  if (searchQuery.value.trim()) {
    searchQuotes()
  } else {
    fetchQuotes()
  }
})

onMounted(() => {
  fetchQuotes()
})
</script>

<template>
  <VCard>
    <!-- Header -->
    <VCardTitle class="d-flex align-center pa-5 pb-2">
      <div>
        <h5 class="text-h5 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-file-invoice" color="primary" size="28" />
          Cotizaciones
        </h5>
        <p class="text-body-2 text-medium-emphasis mb-0 mt-1">
          Gestión de cotizaciones de la empresa
        </p>
      </div>
    </VCardTitle>

    <VCardText class="d-flex flex-wrap gap-4 align-center justify-space-between pb-4">
      <!-- Search -->
      <div style="min-width: 300px; max-width: 400px;" class="flex-grow-1">
        <VTextField
          v-model="searchQuery"
          placeholder="Buscar por referencia..."
          density="compact"
          hide-details
          prepend-inner-icon="tabler-search"
          clearable
          @input="onSearchInput"
          @click:clear="searchQuery = ''; fetchQuotes()"
        />
      </div>

      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        @click="createQuote"
      >
        Crear Cotización
      </VBtn>
    </VCardText>

    <VDivider />

    <!-- Table -->
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
      <!-- Estado -->
      <template #item.facturado="{ item }">
        <VIcon
          :icon="item.facturado ? 'tabler-circle-check-filled' : 'tabler-circle-filled'"
          :color="item.facturado ? 'success' : 'warning'"
          size="22"
        />
        <VTooltip activator="parent" location="top">
          {{ item.facturado ? 'Facturado' : 'Pendiente' }}
        </VTooltip>
      </template>

      <!-- Referencia -->
      <template #item.referencia="{ item }">
        <span class="font-weight-bold text-primary">{{ item.referencia }}</span>
      </template>

      <!-- Fecha -->
      <template #item.fecha="{ item }">
        <span class="font-weight-medium">{{ item.fecha }}</span>
      </template>

      <!-- Almacén -->
      <template #item.almacen="{ item }">
        <div style="min-width: 150px; white-space: normal;">
          <span class="text-body-2">{{ item.almacen?.nombre || 'N/A' }}</span>
        </div>
      </template>

      <!-- Celular -->
      <template #item.cliente="{ item }">
        <span>{{ item.cliente?.celular || 'N/A' }}</span>
      </template>

      <!-- Total -->
      <template #item.total="{ item }">
        <span class="font-weight-bold text-primary" style="font-size: 14px;">
          {{ formatCurrency(item.total) }}
        </span>
      </template>

      <!-- Vendedor (compact: avatar + first name only) -->
      <template #item.encargado="{ item }">
        <div class="d-flex align-center gap-2 text-truncate" style="max-width: 110px;">
          <VAvatar size="24" color="primary" variant="tonal">
            <span class="text-caption font-weight-bold">{{ item.encargado?.name?.charAt(0)?.toUpperCase() || '?' }}</span>
          </VAvatar>
          <span class="text-body-2 text-truncate" :title="item.encargado?.name || 'N/A'">
            {{ item.encargado?.name?.split(' ')[0] || 'N/A' }}
          </span>
        </div>
      </template>

      <!-- Facturar (admin only) -->
      <template v-if="isAdmin" #item.invoice="{ item }">
        <VBtn
          v-if="!item.facturado"
          color="primary"
          variant="tonal"
          size="small"
          prepend-icon="tabler-receipt"
          @click="confirmInvoice(item, tableData.indexOf(item))"
        >
          Facturar
        </VBtn>
        <VChip
          v-else
          color="success"
          variant="flat"
          size="small"
          class="text-uppercase font-weight-medium px-2 w-100 justify-center"
        >
          Facturado
        </VChip>
      </template>

      <!-- Acciones -->
      <template #item.actions="{ item }">
        <div class="d-flex gap-1">
          <IconBtn @click="editQuote(item.id, item.facturado)">
            <VIcon icon="tabler-pencil" />
            <VTooltip activator="parent" location="top">Editar</VTooltip>
          </IconBtn>
          <IconBtn @click="confirmDelete(item.id)">
            <VIcon icon="tabler-trash" color="error" />
            <VTooltip activator="parent" location="top">Eliminar</VTooltip>
          </IconBtn>
          <IconBtn @click="printQuote(item)">
            <VIcon icon="tabler-printer" />
            <VTooltip activator="parent" location="top">Imprimir</VTooltip>
          </IconBtn>
        </div>
      </template>

      <!-- Empty -->
      <template #no-data>
        <div class="text-center text-body-1 py-6">
          <VIcon icon="tabler-file-off" size="48" color="secondary" class="mb-2" />
          <p class="text-medium-emphasis">No hay cotizaciones registradas</p>
        </div>
      </template>
    </VDataTableServer>
  </VCard>

  <!-- Confirm Delete -->
  <AppConfirmDialog
    ref="confirmDeleteDialog"
    title="¿Eliminar Cotización?"
    message="¡Esta acción no se puede deshacer! ¿Estás seguro de eliminar esta cotización?"
    @confirm="executeDelete"
  />

  <!-- Confirm Invoice -->
  <AppConfirmDialog
    ref="confirmInvoiceDialog"
    title="¿Facturar Cotización?"
    message="¿Estás seguro de marcar esta cotización como facturada?"
    confirmText="Facturar"
    @confirm="executeInvoice"
  />

  <!-- Confirm Edit Invoiced -->
  <AppConfirmDialog
    ref="confirmEditInvoicedDialog"
    title="¡Atención!"
    message="Esta cotización ya está FACTURADA. ¿Estás seguro de modificarla?"
    @confirm="executeEditInvoiced"
  />

  <!-- Print confirm dialog -->
  <VDialog v-model="showPrintDialog" max-width="400" persistent>
    <VCard>
      <VCardTitle class="d-flex align-center gap-2 pa-5 pb-3">
        <VIcon icon="tabler-printer" color="primary" />
        Imprimir Cotización
      </VCardTitle>
      <VDivider />
      <VCardText class="pt-4">
        <p class="text-body-1">
          Se abrirá una nueva ventana con la cotización
          <strong class="text-primary">{{ printData?.referencia }}</strong>
          lista para imprimir.
        </p>
      </VCardText>
      <VCardActions class="pa-5 pt-0">
        <VSpacer />
        <VBtn color="secondary" variant="tonal" @click="showPrintDialog = false">
          Cancelar
        </VBtn>
        <VBtn color="primary" prepend-icon="tabler-printer" @click="executePrint">
          Imprimir
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Snackbar -->
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
