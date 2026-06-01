<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { $api } from '@/utils/api'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'

definePage({ name: 'InvoicesList' })

// --------------- Auth ---------------
const user = computed(() => {
  try { return JSON.parse(localStorage.getItem('userData') || '{}') } catch { return {} }
})
const isAdmin = computed(() => user.value?.rol === '1' || user.value?.rol === '3')

// --------------- Table State ---------------
const tableData = ref<any[]>([])
const totalData = ref(0)
const isLoading = ref(false)
const options = ref({ page: 1, itemsPerPage: 50, sortBy: [], groupBy: [], search: undefined })
const itemsPerPageOptions = [50, 100, 150, 200, 500]

// --------------- Filters ---------------
const searchQuery = ref('')
const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const dateFrom = ref('')
const dateTo = ref('')
const selectedCustomer = ref<any>(null)
const customerResults = ref<any[]>([])
const customerStores = ref<any[]>([])
const customerSearchLoading = ref(false)
let customerDebounce: ReturnType<typeof setTimeout> | null = null

// --------------- Dialogs ---------------
const confirmDeleteDialog = ref<InstanceType<typeof AppConfirmDialog> | null>(null)
const itemToDelete = ref<number | null>(null)

// --------------- Snackbar ---------------
const isSnackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// ----------- Pay Modal (full payment) -----------
const showPayDialog = ref(false)
const payInvoice = ref<any>(null)
const payForm = ref({ estado: '', fecha: '', valor_descuento: 0, valor_flete: 0, valor_averias: 0, valor_retencion: 0 })
const payTotal = ref(0)
const payOptions = [
  { title: 'Efectivo', value: 'efectivo' },
  { title: 'Transferencia', value: 'transferencia' },
]

// ----------- Abono Modal (partial payment) -----------
const showAbonoDialog = ref(false)
const abonoInvoice = ref<any>(null)
const abonoForm = ref({ estado: '', fecha: '', valor_abono: 0, descripcion: '' })

// ----------- Abonos View Modal -----------
const showAbonosViewDialog = ref(false)
const abonosViewInvoice = ref<any>(null)
const abonosList = ref<any[]>([])
const totalAbonos = ref(0)
const abonosLoading = ref(false)

// ----------- Send Contabilidad -----------
const showContabilidadDialog = ref(false)
const contabilidadInvoice = ref<any>(null)
const descuentoInput = ref<number>(0)

// ----------- Print -----------
const showPrintDialog = ref(false)
const printData = ref<any>(null)

// --------------- Confirm delete abono ---------------
const confirmDeleteAbonoDialog = ref<InstanceType<typeof AppConfirmDialog> | null>(null)
const abonoToDelete = ref<any>(null)

// --------------- Table Headers ---------------
const headers: any[] = [
  { title: 'Est', key: 'estado', width: '52px', align: 'center' as const, sortable: false },
  { title: 'Ref', key: 'referencia', width: '90px' },
  { title: 'Fecha', key: 'fecha', width: '100px' },
  { title: 'Almacén', key: 'almacen', sortable: false },
  { title: 'Celular', key: 'cliente', width: '115px', sortable: false },
  { title: 'V. Factura', key: 'total', width: '130px', sortable: false },
  { title: 'Total c/desc', key: 'total_descuento', width: '130px', sortable: false },
  { title: 'Faltante', key: 'faltante_pago', width: '130px', sortable: false },
  { title: 'Vendedor', key: 'encargado', width: '115px', sortable: false },
  { title: 'Acciones', key: 'actions', width: '215px', align: 'center' as const, sortable: false },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0)

// --------------- Fetch Invoices ---------------
const fetchInvoices = async () => {
  isLoading.value = true
  try {
    const params: any = { size: options.value.itemsPerPage, page: options.value.page }
    if (!isAdmin.value && user.value?.id) params.id_usuario = user.value.id

    // Filtros activos
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
    if (selectedCustomer.value?.id) params.id_cliente = selectedCustomer.value.id
    if (dateFrom.value && dateTo.value) {
      params.fecha_inicio = dateFrom.value
      params.fecha_fin = dateTo.value
    }

    const response = await $api<any>('/invoice', { params })
    const data = response?.data || response
    tableData.value = data?.data || []
    totalData.value = data?.total || 0
  } catch (e: any) {
    showMsg(e?.data?.message || 'Error al cargar facturas', 'error')
  } finally { isLoading.value = false }
}

const filterByDate = async () => {
  if (!dateFrom.value || !dateTo.value) { showMsg('Seleccione ambas fechas', 'warning'); return }
  options.value.page = 1
  fetchInvoices()
}

const clearFilters = () => {
  searchQuery.value = ''; dateFrom.value = ''; dateTo.value = ''
  selectedCustomer.value = null; customerStores.value = []
  options.value.page = 1
  fetchInvoices()
}

const onSearchInput = () => {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  debounceTimer.value = setTimeout(() => { options.value.page = 1; fetchInvoices() }, 600)
}

// Customer Search
const searchCustomers = async (q: string) => {
  if (!q || q.length < 2) { customerResults.value = []; return }
  customerSearchLoading.value = true
  try {
    const r = await $api<any>('/client/client-search', { params: { input: q } })
    customerResults.value = r?.data || []
  } catch { customerResults.value = [] }
  finally { customerSearchLoading.value = false }
}
const onCustomerSearch = (q: string) => {
  if (customerDebounce) clearTimeout(customerDebounce)
  customerDebounce = setTimeout(() => searchCustomers(q), 300)
}
const selectCustomer = (c: any) => {
  selectedCustomer.value = c
  customerStores.value = c?.almacenes || []
  options.value.page = 1; fetchInvoices()
}

// --------------- Full Payment ---------------
const openPayDialog = async (invoice: any) => {
  payInvoice.value = invoice
  payForm.value = { estado: '', fecha: '', valor_descuento: 0, valor_flete: 0, valor_averias: 0, valor_retencion: 0 }
  payTotal.value = invoice.total || 0
  showPayDialog.value = true
}
const recalcPayTotal = () => {
  if (!payInvoice.value) return
  payTotal.value = (payInvoice.value.total || 0)
    - (payForm.value.valor_descuento || 0)
    - (payForm.value.valor_flete || 0)
    - (payForm.value.valor_averias || 0)
    - (payForm.value.valor_retencion || 0)
}
const executePayment = async () => {
  if (!payForm.value.estado) { showMsg('Seleccione un método de pago', 'error'); return }
  if (!payForm.value.fecha) { showMsg('Ingrese la fecha de pago', 'error'); return }
  try {
    const body = { ...payForm.value, id_factura: payInvoice.value.id }
    const r = await $api<any>('/invoice/pay', { method: 'POST', body })
    if (r?.is_error || r?.data?.is_error) { showMsg(r?.message || 'Error al pagar', 'error'); return }
    showMsg('Pago realizado correctamente', 'success')
    showPayDialog.value = false
    fetchInvoices()
  } catch (e: any) { showMsg(e?.data?.message || 'Error de conexión', 'error') }
}

// --------------- Abonos ---------------
const openAbonoDialog = (invoice: any) => {
  abonoInvoice.value = invoice
  abonoForm.value = { estado: '', fecha: '', valor_abono: 0, descripcion: '' }
  showAbonoDialog.value = true
}
const executeAbono = async () => {
  if (!abonoForm.value.estado) { showMsg('Seleccione un método de pago', 'error'); return }
  if (!abonoForm.value.fecha) { showMsg('Ingrese la fecha', 'error'); return }
  if (!abonoForm.value.valor_abono || abonoForm.value.valor_abono <= 0) { showMsg('Ingrese un monto válido', 'error'); return }
  try {
    const body = { ...abonoForm.value, id_factura: abonoInvoice.value.id }
    const r = await $api<any>('/abonos', { method: 'POST', body })
    if (r?.is_error || r?.data?.is_error) { showMsg(r?.message || 'Error al abonar', 'error'); return }
    showMsg('Abono realizado correctamente', 'success')
    showAbonoDialog.value = false
    fetchInvoices()
  } catch (e: any) { showMsg(e?.data?.message || 'Error de conexión', 'error') }
}

// --------------- Abonos View ---------------
const openAbonosView = async (invoice: any) => {
  abonosViewInvoice.value = invoice
  abonosList.value = []; totalAbonos.value = 0
  showAbonosViewDialog.value = true
  abonosLoading.value = true
  try {
    const r = await $api<any>('/abonos', { params: { id_factura: invoice.id } })
    abonosList.value = r?.data?.data || r?.data || []
    totalAbonos.value = abonosList.value.reduce((s: number, a: any) => s + (a.valor || 0), 0)
  } catch { abonosList.value = [] }
  finally { abonosLoading.value = false }
}
const deleteAbono = (abono: any) => {
  abonoToDelete.value = abono
  confirmDeleteAbonoDialog.value?.open()
}
const executeDeleteAbono = async () => {
  if (!abonoToDelete.value) return
  try {
    const a = abonoToDelete.value
    await $api<any>('/abonos/delete', { method: 'POST', body: { id: a.id, id_factura: a.id_factura, valor_abono: a.valor } })
    showMsg('Abono eliminado', 'success')
    if (abonosViewInvoice.value) openAbonosView(abonosViewInvoice.value)
    fetchInvoices()
  } catch { showMsg('Error al eliminar abono', 'error') }
  finally { abonoToDelete.value = null }
}

// --------------- Delete Invoice ---------------
const confirmDelete = (id: number) => { itemToDelete.value = id; confirmDeleteDialog.value?.open() }
const executeDelete = async () => {
  if (!itemToDelete.value) return
  try {
    await $api<any>(`/invoice/${itemToDelete.value}`, { method: 'DELETE' })
    showMsg('Factura anulada correctamente', 'success')
    fetchInvoices()
  } catch (e: any) {
    showMsg(e?.data?.message || 'Error al anular', 'error')
  } finally { itemToDelete.value = null }
}

// --------------- Contabilidad ---------------
const openContabilidad = (invoice: any) => {
  contabilidadInvoice.value = invoice; descuentoInput.value = 0; showContabilidadDialog.value = true
}
const executeContabilidad = async () => {
  if (descuentoInput.value < 0 || descuentoInput.value > 100) { showMsg('Ingrese un valor entre 0 y 100', 'error'); return }
  try {
    const body = { descuentoInput: descuentoInput.value, ...contabilidadInvoice.value }
    const r = await $api<any>('/factura-contable', { method: 'POST', body })
    if (r?.is_error) { showMsg(r?.message || 'Error al enviar', 'error'); return }
    showMsg('Factura enviada correctamente', 'success')
    showContabilidadDialog.value = false
  } catch (e: any) { showMsg(e?.data?.message || 'Error de conexión', 'error') }
}

// --------------- CSV Export ---------------
const exportCSV = async (invoice: any) => {
  try {
    const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || ''
    const token = localStorage.getItem('app-token') || localStorage.getItem('accessToken') || ''
    const response = await fetch(`${baseUrl}/invoice/xlsx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ...invoice }),
    })
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.setAttribute('download', `factura-${invoice.referencia}.csv`)
    document.body.appendChild(link); link.click(); link.remove()
    window.URL.revokeObjectURL(url)
    showMsg('CSV descargado correctamente', 'success')
  } catch { showMsg('Error al descargar CSV', 'error') }
}

// --------------- Print ---------------
const openPrint = (invoice: any) => { printData.value = invoice; showPrintDialog.value = true }
const executePrint = () => {
  const data = printData.value; if (!data) return
  const products = data.productos || []
  const rows = products.map((p: any, i: number) => `
    <tr>
      <td style="border-bottom:1px solid #eee;padding:8px">${i + 1}</td>
      <td style="border-bottom:1px solid #eee;padding:8px">${p.referencia || ''}</td>
      <td style="border-bottom:1px solid #eee;padding:8px">${p.nombre || ''}</td>
      <td style="border-bottom:1px solid #eee;padding:8px;text-align:center">${p.cantidad || p.cantidad_cotizacion || ''}</td>
      <td style="border-bottom:1px solid #eee;padding:8px;text-align:right">${formatCurrency(p.valor_unidad || 0)}</td>
      <td style="border-bottom:1px solid #eee;padding:8px;text-align:right;font-weight:bold">${formatCurrency(p.valor_total || 0)}</td>
    </tr>`).join('')
  const html = `<html><head><title>Factura ${data.referencia}</title>
    <style>body{font-family:Arial,sans-serif;color:#333;margin:0;padding:20px} @media print{body{padding:0}}</style></head><body>
    <div style="text-align:center;margin-bottom:20px">
      <h1 style="color:#331791;margin:5px 0;font-size:1.8rem">T|L</h1>
      <h2 style="margin:5px 0;font-size:1.4rem">TECHLOVERS STORE</h2>
      <p style="margin:2px 0;color:#666">TECH LOVERS SAS</p>
      <p style="margin:2px 0;color:#666">NIT 902034057</p>
      <p style="margin:2px 0;color:#331791">TELEFONO - 3217324582</p>
    </div>
    <div style="display:flex;justify-content:space-between;margin:20px auto;width:85%">
      <div style="width:48%">
        <p style="margin:4px 0"><strong style="color:#331791">Referencia:</strong> ${data.referencia}</p>
        <p style="margin:4px 0"><strong style="color:#331791">Fecha:</strong> ${data.fecha}</p>
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
      <thead><tr style="background:#331791;color:white">
        <th style="padding:10px">ITEM</th><th style="padding:10px">REF</th><th style="padding:10px">DESCRIPCIÓN</th>
        <th style="padding:10px;text-align:center">CANT.</th><th style="padding:10px;text-align:right">V. UNIDAD</th><th style="padding:10px;text-align:right">TOTAL</th>
      </tr></thead><tbody>${rows}</tbody>
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
        <p style="margin:4px 0">NOTA: <span>PARA REALIZAR PAGOS FAVOR LLAMAR AL # <b>+57 321 7324582</b></span></p>
        <p style="margin:4px 0;color:red;font-size:12px">PASADOS LOS 45 DIAS LA FACTURA NO APLICA DESCUENTO</p>
      </div>
      <div style="width:48%">
        <p style="margin:4px 0"><b style="text-decoration:underline">ÚNICAS CUENTAS AUTORIZADAS</b></p>
        <p style="margin:4px 0"><b>Confirmar antes de realizar el pago</b></p>
        <p style="margin:4px 0"><b>#00600011118</b> AHORROS BANCOLOMBIA</p>
      </div>
    </div>
    <div style="width:85%;margin:40px auto;display:flex;justify-content:space-between">
      <p>Despacho: __________________________</p><p>Recibe: _____________________________</p>
    </div>
  </body></html>`
  const w = window.open('', '_blank', '')
  if (w) { w.document.write(html); w.document.close(); w.print() }
  showPrintDialog.value = false
}

// --------------- Helpers ---------------
const showMsg = (msg: string, color: string) => {
  snackbarMessage.value = msg; snackbarColor.value = color; isSnackbarVisible.value = true
}

watch([() => options.value.page, () => options.value.itemsPerPage], () => {
  fetchInvoices()
})

onMounted(() => { fetchInvoices() })
</script>

<template>
  <VCard>
    <!-- Header -->
    <VCardTitle class="d-flex align-center pa-5 pb-2">
      <div>
        <h5 class="text-h5 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-receipt" color="primary" size="28" />
          Facturas
        </h5>
        <p class="text-body-2 text-medium-emphasis mb-0 mt-1">
          Gestión y seguimiento de facturas
        </p>
      </div>
    </VCardTitle>

    <VDivider />

    <!-- Filters -->
    <VCardText class="py-4">
      <VRow dense align="center">
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model="searchQuery"
            placeholder="Buscar por referencia..."
            density="compact"
            hide-details
            prepend-inner-icon="tabler-search"
            clearable
            @input="onSearchInput"
            @click:clear="searchQuery = ''; fetchInvoices()"
          />
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VAutocomplete
            :model-value="selectedCustomer"
            :items="customerResults"
            :loading="customerSearchLoading"
            item-title="nombre"
            item-value="id"
            placeholder="Filtrar por cliente..."
            density="compact"
            hide-details
            prepend-inner-icon="tabler-user"
            no-filter
            return-object
            clearable
            hide-no-data
            @update:search="onCustomerSearch"
            @update:model-value="(val: any) => { if (val && typeof val === 'object') selectCustomer(val) }"
            @click:clear="() => { selectedCustomer = null; customerStores = []; fetchInvoices() }"
          />
        </VCol>

        <VCol cols="12" sm="6" md="2">
          <VTextField v-model="dateFrom" type="date" label="Desde" density="compact" hide-details />
        </VCol>
        <VCol cols="12" sm="6" md="2">
          <VTextField v-model="dateTo" type="date" label="Hasta" density="compact" hide-details />
        </VCol>

        <VCol cols="12" sm="12" md="2" class="d-flex gap-2 justify-end">
          <VBtn variant="tonal" color="secondary" density="compact" prepend-icon="tabler-calendar-search" @click="filterByDate">
            Filtrar
          </VBtn>
          <VBtn variant="tonal" color="error" density="compact" icon="tabler-x" @click="clearFilters">
            <VTooltip activator="parent" location="top">Limpiar filtros</VTooltip>
          </VBtn>
        </VCol>
      </VRow>
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
    >
      <!-- Estado -->
      <template #item.estado="{ item }">
        <VIcon
          :icon="item.estado === 'pagado' ? 'tabler-circle-check-filled' : 'tabler-circle-filled'"
          :color="item.estado === 'pagado' ? 'success' : 'warning'"
          size="22"
        />
        <VTooltip activator="parent" location="top">
          {{ item.estado === 'pagado' ? 'Pagado' : 'Pendiente de pago' }}
        </VTooltip>
      </template>

      <!-- Referencia -->
      <template #item.referencia="{ item }">
        <span class="font-weight-bold text-primary">{{ item.referencia }}</span>
      </template>

      <!-- Almacen -->
      <template #item.almacen="{ item }">
        <div style="min-width: 120px; white-space: normal; line-height: 1.3">
          <span class="text-body-2">{{ item.almacen?.nombre || 'N/A' }}</span>
        </div>
      </template>

      <!-- Celular -->
      <template #item.cliente="{ item }">
        <span>{{ item.cliente?.celular || 'N/A' }}</span>
      </template>

      <!-- V. Factura -->
      <template #item.total="{ item }">
        <span class="font-weight-medium text-primary" style="font-size:13px">{{ formatCurrency(item.total) }}</span>
      </template>

      <!-- Total con descuento -->
      <template #item.total_descuento="{ item }">
        <span class="font-weight-bold text-error" style="font-size:13px">{{ formatCurrency(item.total_descuento) }}</span>
      </template>

      <!-- Faltante pago -->
      <template #item.faltante_pago="{ item }">
        <VChip
          :color="(item.faltante_pago ?? 0) <= 0 ? 'success' : 'warning'"
          variant="flat"
          size="small"
          class="font-weight-bold w-100 justify-center"
        >
          {{ formatCurrency(item.faltante_pago) }}
        </VChip>
      </template>

      <!-- Vendedor -->
      <template #item.encargado="{ item }">
        <div class="d-flex align-center gap-2 text-truncate" style="max-width: 105px;">
          <VAvatar size="22" color="primary" variant="tonal">
            <span class="text-caption font-weight-bold">{{ item.encargado?.name?.charAt(0)?.toUpperCase() || '?' }}</span>
          </VAvatar>
          <span class="text-body-2 text-truncate" :title="item.encargado?.name">
            {{ item.encargado?.name?.split(' ')[0] || 'N/A' }}
          </span>
        </div>
      </template>

      <!-- Acciones -->
      <template #item.actions="{ item }">
        <div class="d-flex gap-1 justify-center">
          <!-- Ver abonos -->
          <IconBtn size="small" @click="openAbonosView(item)">
            <VIcon icon="tabler-eye" size="17" />
            <VTooltip activator="parent" location="top">Ver Abonos</VTooltip>
          </IconBtn>

          <!-- Pagar total -->
          <IconBtn v-if="item.estado !== 'pagado'" size="small" @click="openPayDialog(item)">
            <VIcon icon="tabler-cash" size="17" color="success" />
            <VTooltip activator="parent" location="top">Pagar Factura</VTooltip>
          </IconBtn>

          <!-- Abonar -->
          <IconBtn v-if="item.estado !== 'pagado'" size="small" @click="openAbonoDialog(item)">
            <VIcon icon="tabler-coin" size="17" color="warning" />
            <VTooltip activator="parent" location="top">Abonar</VTooltip>
          </IconBtn>

          <!-- Imprimir -->
          <IconBtn size="small" @click="openPrint(item)">
            <VIcon icon="tabler-printer" size="17" />
            <VTooltip activator="parent" location="top">Imprimir</VTooltip>
          </IconBtn>

          <!-- Contabilidad -->
          <IconBtn size="small" @click="openContabilidad(item)">
            <VIcon icon="tabler-send" size="17" color="info" />
            <VTooltip activator="parent" location="top">Enviar a Contabilidad</VTooltip>
          </IconBtn>

          <!-- CSV -->
          <IconBtn size="small" @click="exportCSV(item)">
            <VIcon icon="tabler-table-export" size="17" />
            <VTooltip activator="parent" location="top">Descargar CSV</VTooltip>
          </IconBtn>

          <!-- Anular (admin, pendiente) -->
          <IconBtn v-if="isAdmin && item.estado !== 'pagado'" size="small" @click="confirmDelete(item.id)">
            <VIcon icon="tabler-trash" size="17" color="error" />
            <VTooltip activator="parent" location="top">Anular Factura</VTooltip>
          </IconBtn>
        </div>
      </template>

      <!-- No data -->
      <template #no-data>
        <div class="text-center py-8">
          <VIcon icon="tabler-receipt-off" size="52" color="secondary" class="mb-2" />
          <p class="text-medium-emphasis text-body-1 mb-0">No hay facturas registradas</p>
        </div>
      </template>
    </VDataTableServer>
  </VCard>

  <!-- ===== DIALOG: Pago Completo ===== -->
  <VDialog v-model="showPayDialog" max-width="520" persistent>
    <VCard>
      <VCardTitle class="d-flex align-center gap-2 pa-5 pb-3">
        <VIcon icon="tabler-cash" color="success" />
        Pagar Factura
        <VSpacer />
        <span class="text-body-2 font-weight-bold text-primary">{{ payInvoice?.referencia }}</span>
      </VCardTitle>
      <VDivider />
      <VCardText class="pa-5">
        <VRow>
          <VCol cols="12" md="6">
            <VSelect v-model="payForm.estado" :items="payOptions" item-title="title" item-value="value" label="Método de pago *" variant="outlined" density="compact" />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField v-model="payForm.fecha" type="date" label="Fecha de pago *" variant="outlined" density="compact" />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField v-model.number="payForm.valor_descuento" type="number" label="Descuento" prefix="$" variant="outlined" density="compact" min="0" @input="recalcPayTotal" />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField v-model.number="payForm.valor_flete" type="number" label="Flete" prefix="$" variant="outlined" density="compact" min="0" @input="recalcPayTotal" />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField v-model.number="payForm.valor_averias" type="number" label="Averías" prefix="$" variant="outlined" density="compact" min="0" @input="recalcPayTotal" />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField v-model.number="payForm.valor_retencion" type="number" label="Retención" prefix="$" variant="outlined" density="compact" min="0" @input="recalcPayTotal" />
          </VCol>
          <VCol cols="12">
            <VCard variant="tonal" color="success" class="pa-4 d-flex justify-space-between align-center rounded-lg">
              <span class="text-h6 font-weight-bold">Total a Pagar</span>
              <span class="text-h4 font-weight-bold">{{ formatCurrency(payTotal) }}</span>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>
      <VDivider />
      <VCardActions class="pa-5 pt-3">
        <VSpacer />
        <VBtn variant="tonal" color="secondary" @click="showPayDialog = false">Cancelar</VBtn>
        <VBtn color="success" prepend-icon="tabler-check" @click="executePayment">Confirmar Pago</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- ===== DIALOG: Abono Parcial ===== -->
  <VDialog v-model="showAbonoDialog" max-width="460" persistent>
    <VCard>
      <VCardTitle class="d-flex align-center gap-2 pa-5 pb-3">
        <VIcon icon="tabler-coin" color="warning" />
        Registrar Abono
        <VSpacer />
        <span class="text-body-2 font-weight-bold text-primary">{{ abonoInvoice?.referencia }}</span>
      </VCardTitle>
      <VDivider />
      <VCardText class="pa-5">
        <VRow>
          <VCol cols="12" md="6">
            <VSelect v-model="abonoForm.estado" :items="payOptions" item-title="title" item-value="value" label="Método de pago *" variant="outlined" density="compact" />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField v-model="abonoForm.fecha" type="date" label="Fecha *" variant="outlined" density="compact" />
          </VCol>
          <VCol cols="12">
            <VTextField v-model.number="abonoForm.valor_abono" type="number" label="Valor del abono *" prefix="$" variant="outlined" density="compact" min="1" />
          </VCol>
          <VCol cols="12">
            <VTextarea v-model="abonoForm.descripcion" label="Descripción" rows="2" auto-grow variant="outlined" />
          </VCol>
        </VRow>
      </VCardText>
      <VDivider />
      <VCardActions class="pa-5 pt-3">
        <VSpacer />
        <VBtn variant="tonal" color="secondary" @click="showAbonoDialog = false">Cancelar</VBtn>
        <VBtn color="warning" prepend-icon="tabler-check" @click="executeAbono">Guardar Abono</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- ===== DIALOG: Ver Abonos ===== -->
  <VDialog v-model="showAbonosViewDialog" max-width="680" scrollable>
    <VCard>
      <VCardTitle class="d-flex align-center gap-2 pa-5 pb-3">
        <VIcon icon="tabler-list-details" color="primary" />
        Resumen de Abonos — {{ abonosViewInvoice?.referencia }}
        <VSpacer />
        <IconBtn @click="showAbonosViewDialog = false"><VIcon icon="tabler-x" /></IconBtn>
      </VCardTitle>
      <VDivider />
      <VCardText class="pa-0">
        <div v-if="abonosLoading" class="d-flex justify-center pa-8">
          <VProgressCircular indeterminate color="primary" />
        </div>
        <VDataTable
          v-else
          :headers="[
            { title: 'Fecha', key: 'fecha', width: '110px' },
            { title: 'Método', key: 'estado', width: '145px' },
            { title: 'Valor', key: 'valor' },
            { title: 'Descripción', key: 'descripcion' },
            { title: '', key: 'del', width: '52px', align: 'center' as const, sortable: false },
          ]"
          :items="abonosList"
          density="compact"
          hide-default-footer
          :items-per-page="-1"
          class="text-body-2"
        >
          <template #item.estado="{ item }">
            <VChip :color="item.estado === 'efectivo' ? 'success' : 'info'" variant="flat" size="small" class="font-weight-medium px-2">
              {{ item.estado === 'efectivo' ? '💵 Efectivo' : '💳 Transferencia' }}
            </VChip>
          </template>
          <template #item.valor="{ item }">
            <span class="font-weight-bold text-primary">{{ formatCurrency(item.valor) }}</span>
          </template>
          <template #item.del="{ item }">
            <IconBtn v-if="abonosViewInvoice?.estado !== 'pagado'" size="small" @click="deleteAbono(item)">
              <VIcon icon="tabler-trash" color="error" size="17" />
            </IconBtn>
          </template>
          <template #no-data>
            <div class="text-center py-6 text-medium-emphasis">Sin abonos registrados</div>
          </template>
        </VDataTable>
      </VCardText>
      <VDivider />
      <VCardText class="pa-4">
        <div class="d-flex justify-space-between align-center">
          <span class="text-body-1 font-weight-medium">Total abonado:</span>
          <span class="text-h5 font-weight-bold text-primary">{{ formatCurrency(totalAbonos) }}</span>
        </div>
        <div class="d-flex justify-space-between align-center mt-1">
          <span class="text-body-2 text-medium-emphasis">Faltante por pagar:</span>
          <VChip :color="(abonosViewInvoice?.faltante_pago ?? 0) <= 0 ? 'success' : 'warning'" variant="flat" size="small" class="font-weight-bold">
            {{ formatCurrency(abonosViewInvoice?.faltante_pago ?? 0) }}
          </VChip>
        </div>
      </VCardText>
      <VDivider />
      <VCardActions class="pa-4 pt-3 d-flex flex-wrap gap-2 justify-end">
        <VBtn v-if="abonosViewInvoice?.estado !== 'pagado'" color="warning" variant="tonal" prepend-icon="tabler-coin"
          @click="showAbonosViewDialog = false; openAbonoDialog(abonosViewInvoice)">
          Nuevo Abono
        </VBtn>
        <VBtn variant="tonal" color="secondary" @click="showAbonosViewDialog = false">Cerrar</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- ===== DIALOG: Contabilidad ===== -->
  <VDialog v-model="showContabilidadDialog" max-width="420" persistent>
    <VCard>
      <VCardTitle class="d-flex align-center gap-2 pa-5 pb-3">
        <VIcon icon="tabler-send" color="info" />
        Enviar a Contabilidad
        <VSpacer />
        <span class="text-body-2 font-weight-bold text-primary">{{ contabilidadInvoice?.referencia }}</span>
      </VCardTitle>
      <VDivider />
      <VCardText class="pa-5">
        <p class="text-body-2 text-medium-emphasis mb-4">
          Ingrese el porcentaje de descuento a aplicar (entre 0 y 100):
        </p>
        <VTextField v-model.number="descuentoInput" type="number" label="Porcentaje de descuento" suffix="%" variant="outlined" density="compact" :min="0" :max="100" />
      </VCardText>
      <VDivider />
      <VCardActions class="pa-5 pt-3">
        <VSpacer />
        <VBtn variant="tonal" color="secondary" @click="showContabilidadDialog = false">Cancelar</VBtn>
        <VBtn color="info" prepend-icon="tabler-send" @click="executeContabilidad">Enviar</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- ===== DIALOG: Print ===== -->
  <VDialog v-model="showPrintDialog" max-width="380" persistent>
    <VCard>
      <VCardTitle class="d-flex align-center gap-2 pa-5 pb-3">
        <VIcon icon="tabler-printer" color="primary" />
        Imprimir Factura
      </VCardTitle>
      <VDivider />
      <VCardText class="pt-4">
        <p class="text-body-1">Se abrirá una nueva ventana con la factura
          <strong class="text-primary">{{ printData?.referencia }}</strong> lista para imprimir.
        </p>
      </VCardText>
      <VCardActions class="pa-5 pt-0">
        <VSpacer />
        <VBtn variant="tonal" color="secondary" @click="showPrintDialog = false">Cancelar</VBtn>
        <VBtn color="primary" prepend-icon="tabler-printer" @click="executePrint">Imprimir</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- ===== CONFIRM: Anular Factura ===== -->
  <AppConfirmDialog
    ref="confirmDeleteDialog"
    title="¿Anular Factura?"
    message="¡Esta acción no se puede deshacer! ¿Estás seguro de anular esta factura?"
    @confirm="executeDelete"
  />

  <!-- ===== CONFIRM: Eliminar Abono ===== -->
  <AppConfirmDialog
    ref="confirmDeleteAbonoDialog"
    title="¿Eliminar Abono?"
    message="¿Estás seguro de eliminar este abono? El faltante de pago será recalculado."
    @confirm="executeDeleteAbono"
  />

  <!-- Snackbar -->
  <VSnackbar v-model="isSnackbarVisible" :color="snackbarColor" location="top end" :timeout="3500">
    {{ snackbarMessage }}
    <template #actions>
      <VBtn color="white" variant="text" icon="tabler-x" @click="isSnackbarVisible = false" />
    </template>
  </VSnackbar>
</template>
