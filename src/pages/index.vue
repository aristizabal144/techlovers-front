<script lang="ts" setup>
import { useDashboardStore } from '@/stores/useDashboardStore'
import { computed, onMounted, ref } from 'vue'

const dashboardStore = useDashboardStore()

const dateFrom = ref('')
const dateTo = ref('')

import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

const generateDashboard = async () => {
  await dashboardStore.fetchDashboardData(dateFrom.value, dateTo.value)
}

onMounted(() => {
  const currentRole = String(authStore.auth?.rol || localStorage.getItem('app-current-role'))
  if (currentRole === '3') {
    router.replace('/cotizaciones')
    return
  }
  generateDashboard()
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

// Table Headers
const gastosHeaders = [
  { title: 'FECHA', key: 'fecha', width: '150px' },
  { title: 'VALOR', key: 'valor', width: '150px' },
  { title: 'DESCRIPCIÓN', key: 'descripcion', width: '300px' },
]

const resumenHeaders = [
  { title: 'DESCRIPCIÓN', key: 'referencia' },
  { title: 'VALOR', key: 'valor' },
]

const abonosHeaders = [
  { title: 'REF', key: 'factura.referencia', width: '120px' },
  { title: 'FECHA', key: 'fecha', width: '150px' },
  { title: 'VALOR', key: 'valor', width: '150px' },
  { title: 'TIPO', key: 'tipo', width: '120px' },
  { title: 'DESCRIPCIÓN', key: 'descripcion', width: '250px' },
]

const valesHeaders = [
  { title: 'FECHA', key: 'fecha' },
  { title: 'VALOR', key: 'valor' },
]

const ventasHeaders = [
  { title: 'REF', key: 'referencia', width: '100px' },
  { title: 'FECHA', key: 'fecha', width: '150px' },
  { title: 'VALOR TOTAL', key: 'total', width: '150px' },
  { title: 'ALMACÉN', key: 'almacen.nombre', width: '200px' },
  { title: 'VENDEDOR', key: 'encargado.name', width: '200px' },
]

const getResumenIconInfo = (index: number) => {
  const icons = [
    { icon: 'tabler-cash', color: 'success', textClass: 'text-success' }, // INGRESO EFECTIVO
    { icon: 'tabler-building-bank', color: 'info', textClass: 'text-info' }, // INGRESO TRANSFERENCIA
    { icon: 'tabler-arrow-down-circle', color: 'warning', textClass: 'text-warning' }, // GASTOS EFECTIVO
    { icon: 'tabler-arrow-down-circle', color: 'warning', textClass: 'text-warning' }, // GASTOS TRANSF
    { icon: 'tabler-ticket', color: 'error', textClass: 'text-error' }, // VALES
    { icon: 'tabler-calculator', color: 'primary', textClass: 'text-primary font-weight-bold' }, // TOTAL CALCULADO
  ]
  return icons[index] || { icon: 'tabler-circle', color: 'secondary', textClass: 'text-secondary' }
}

const currentTab = ref(0)
const currentAbonosTab = ref(0)
</script>

<template>
  <div>
    <!-- Page Title -->
    <div class="d-flex align-center mb-6">
      <VIcon icon="tabler-grid-dots" size="36" class="me-3 text-primary" />
      <h1 class="text-h3 font-weight-bold">Dashboard</h1>
    </div>

    <!-- Filters -->
    <VCard class="mb-6">
      <VCardItem>
        <VRow class="align-center">
          <VCol cols="12" md="4">
            <AppTextField
              v-model="dateFrom"
              type="date"
              label="Desde"
              density="compact"
            />
          </VCol>
          <VCol cols="12" md="4">
            <AppTextField
              v-model="dateTo"
              type="date"
              label="Hasta"
              density="compact"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VBtn
              color="primary"
              :loading="dashboardStore.isLoading"
              @click="generateDashboard"
            >
              <VIcon start icon="tabler-search" />
              Filtrar
            </VBtn>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Top Statistical Cards -->
    <VRow class="mb-6">
      <!-- Saldo Cancelado -->
      <VCol cols="12" sm="6" md="3">
        <VCard>
          <VCardText class="d-flex justify-space-between pb-4">
            <div class="d-flex flex-column">
              <span class="text-h6 font-weight-regular mb-1">Saldo Cancelado</span>
              <span v-if="!dashboardStore.isLoading" class="text-h4 text-success font-weight-bold">
                {{ formatCurrency(dashboardStore.cartera.saldo_cancelado) }}
              </span>
              <VProgressCircular v-else indeterminate color="success" size="24" class="mt-2" />
            </div>
            <VAvatar color="success" variant="tonal" rounded size="42">
              <VIcon icon="tabler-cash-banknote" size="26" />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Saldo Cartera -->
      <VCol cols="12" sm="6" md="3">
        <VCard>
          <VCardText class="d-flex justify-space-between pb-4">
            <div class="d-flex flex-column">
              <span class="text-h6 font-weight-regular mb-1">Saldo Cartera</span>
              <span v-if="!dashboardStore.isLoading" class="text-h4 text-warning font-weight-bold">
                {{ formatCurrency(dashboardStore.cartera.saldo_cartera) }}
              </span>
              <VProgressCircular v-else indeterminate color="warning" size="24" class="mt-2" />
            </div>
            <VAvatar color="warning" variant="tonal" rounded size="42">
              <VIcon icon="tabler-wallet" size="26" />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Total Ventas -->
      <VCol cols="12" sm="6" md="3">
        <VCard>
          <VCardText class="d-flex justify-space-between pb-4">
            <div class="d-flex flex-column">
              <span class="text-h6 font-weight-regular mb-1">Total Ventas</span>
              <span v-if="!dashboardStore.isLoading" class="text-h4 text-primary font-weight-bold">
                {{ formatCurrency(dashboardStore.totalVentas) }}
              </span>
              <VProgressCircular v-else indeterminate color="primary" size="24" class="mt-2" />
            </div>
            <VAvatar color="primary" variant="tonal" rounded size="42">
              <VIcon icon="tabler-shopping-cart" size="26" />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Total Vales -->
      <VCol cols="12" sm="6" md="3">
        <VCard>
          <VCardText class="d-flex justify-space-between pb-4">
            <div class="d-flex flex-column">
              <span class="text-h6 font-weight-regular mb-1">Total Vales</span>
              <span v-if="!dashboardStore.isLoading" class="text-h4 text-error font-weight-bold">
                {{ formatCurrency(dashboardStore.totalVales) }}
              </span>
              <VProgressCircular v-else indeterminate color="error" size="24" class="mt-2" />
            </div>
            <VAvatar color="error" variant="tonal" rounded size="42">
              <VIcon icon="tabler-ticket" size="26" />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Resumen & Expenses Summary Grid -->
    <VRow class="mb-6">
      
      <!-- Resumen Efectivo (Moved to the left/first) -->
      <VCol cols="12" xl="4">
        <VCard title="Resumen General" class="h-100" subtitle="Métricas de ingresos y egresos">
          <VCardText>
            <div v-if="dashboardStore.isLoading" class="d-flex justify-center align-center h-100" style="min-height: 200px">
              <VProgressCircular indeterminate color="primary" />
            </div>
            <VList v-else class="card-list">
              <VListItem 
                v-for="(item, index) in dashboardStore.resumenEfectivo" 
                :key="index" 
                :class="index === 5 ? 'mt-4 border-t-sm pt-4' : ''"
              >
                <template #prepend>
                   <VAvatar :color="getResumenIconInfo(index).color" variant="tonal" rounded size="36">
                     <VIcon :icon="getResumenIconInfo(index).icon" />
                   </VAvatar>
                </template>
                
                <VListItemTitle class="text-body-1 text-wrap" style="line-height: 1.25rem;">
                  {{ item.referencia }}
                </VListItemTitle>
                
                <template #append>
                  <div class="d-flex align-center font-weight-medium ml-2">
                    <span :class="getResumenIconInfo(index).textClass">
                      {{ formatCurrency(Number(item?.valor || 0)) }}
                    </span>
                  </div>
                </template>
              </VListItem>
            </VList>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Gastos Efectivo / Transferencia -->
      <VCol cols="12" xl="8">
        <VCard>
          <VTabs v-model="currentTab">
            <VTab>Gastos Efectivo</VTab>
            <VTab>Gastos Transferencia</VTab>
          </VTabs>
          
          <VCardText>
            <VWindow v-model="currentTab">
              <!-- Efectivo Tab -->
              <VWindowItem>
                <VDataTable
                  :headers="gastosHeaders"
                  :items="dashboardStore.gastosEfectivo.gastos"
                  :loading="dashboardStore.isLoading"
                  items-per-page="5"
                  density="compact"
                >
                  <template #item.valor="{ item }">
                    <span class="text-primary font-weight-bold">{{ formatCurrency(item?.valor || 0) }}</span>
                  </template>
                  <template #item.descripcion="{ item }">
                    <span>{{ item.descripcion.toUpperCase() }}</span>
                  </template>
                </VDataTable>
                
                <div class="d-flex justify-end mt-4">
                  <VAlert color="error" variant="tonal" class="w-100" style="max-width: 400px">
                    <div class="d-flex justify-space-between align-center font-weight-bold text-h6">
                      <span>Total Gastos Efectivo:</span>
                      <span>{{ formatCurrency(dashboardStore.gastosEfectivo.total_gastos) }}</span>
                    </div>
                  </VAlert>
                </div>
              </VWindowItem>

              <!-- Transferencia Tab -->
              <VWindowItem>
                <VDataTable
                  :headers="gastosHeaders"
                  :items="dashboardStore.gastosTransferencia.gastos"
                  :loading="dashboardStore.isLoading"
                  items-per-page="5"
                  density="compact"
                >
                  <template #item.valor="{ item }">
                    <span class="text-primary font-weight-bold">{{ formatCurrency(item?.valor || 0) }}</span>
                  </template>
                  <template #item.descripcion="{ item }">
                    <span>{{ item.descripcion.toUpperCase() }}</span>
                  </template>
                </VDataTable>

                <div class="d-flex justify-end mt-4">
                  <VAlert color="error" variant="tonal" class="w-100" style="max-width: 400px">
                    <div class="d-flex justify-space-between align-center font-weight-bold text-h6">
                      <span>Total Gastos Transf:</span>
                      <span>{{ formatCurrency(dashboardStore.gastosTransferencia.total_gastos) }}</span>
                    </div>
                  </VAlert>
                </div>
              </VWindowItem>
            </VWindow>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Abonos a Facturas -->
    <VCard class="mb-6">
      <VTabs v-model="currentAbonosTab">
        <VTab>Abonos Efectivo</VTab>
        <VTab>Abonos Transferencia</VTab>
      </VTabs>

      <VCardText>
        <VWindow v-model="currentAbonosTab">
          <VWindowItem>
            <VDataTable
              :headers="abonosHeaders"
              :items="dashboardStore.facturasEfectivo"
              :loading="dashboardStore.isLoading"
              items-per-page="5"
              density="compact"
            >
              <template #item.valor="{ item }">
                <span class="text-primary font-weight-bold">{{ formatCurrency(item.valor) }}</span>
              </template>
              <template #item.tipo>
                <VChip color="success" size="small">EFECTIVO 🤑</VChip>
              </template>
            </VDataTable>
            
            <div class="d-flex justify-end mt-4">
               <VAlert color="error" variant="tonal" class="w-100" style="max-width: 400px">
                  <div class="d-flex justify-space-between align-center font-weight-bold">
                    <span>Total Efectivo:</span>
                    <span>{{ formatCurrency(dashboardStore.facturasEfectivoTotal) }}</span>
                  </div>
                </VAlert>
            </div>
          </VWindowItem>

          <VWindowItem>
            <VDataTable
              :headers="abonosHeaders"
              :items="dashboardStore.facturasTransferencia"
              :loading="dashboardStore.isLoading"
              items-per-page="5"
              density="compact"
            >
              <template #item.valor="{ item }">
                <span class="text-primary font-weight-bold">{{ formatCurrency(item.valor) }}</span>
              </template>
              <template #item.tipo>
                <VChip color="info" size="small">TRANSFERENCIA 💳</VChip>
              </template>
            </VDataTable>

            <div class="d-flex justify-end mt-4">
               <VAlert color="error" variant="tonal" class="w-100" style="max-width: 400px">
                  <div class="d-flex justify-space-between align-center font-weight-bold">
                    <span>Total Transferencia:</span>
                    <span>{{ formatCurrency(dashboardStore.facturasTransferenciaTotal) }}</span>
                  </div>
                </VAlert>
            </div>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>

    <!-- Ventas and Vales Row -->
    <VRow>
      <VCol cols="12" xl="8">
        <VCard title="Informe de Ventas" class="h-100">
          <VCardText>
            <VDataTable
              :headers="ventasHeaders"
              :items="dashboardStore.ventas"
              :loading="dashboardStore.isLoading"
              items-per-page="5"
              density="compact"
            >
              <template #item.total="{ item }">
                <span class="text-primary font-weight-bold">{{ formatCurrency(item?.total || 0) }}</span>
              </template>
            </VDataTable>
            
            <div class="d-flex justify-end mt-4">
               <VAlert color="error" variant="tonal" class="w-100" style="max-width: 400px">
                  <div class="d-flex justify-space-between align-center font-weight-bold text-h6">
                    <span>Total Ventas:</span>
                    <span>{{ formatCurrency(dashboardStore.totalVentas) }}</span>
                  </div>
                </VAlert>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" xl="4">
        <VCard title="Informe de Vales" class="h-100">
           <VCardText>
            <VDataTable
              :headers="valesHeaders"
              :items="dashboardStore.vales"
              :loading="dashboardStore.isLoading"
              items-per-page="5"
              density="compact"
            >
              <template #item.valor="{ item }">
                <span :class="(item?.valor || 0) > 0 ? 'text-success font-weight-bold' : 'text-error font-weight-bold'">
                  {{ formatCurrency(item?.valor || 0) }}
                </span>
              </template>
            </VDataTable>

            <div class="d-flex justify-end mt-4">
               <VAlert color="error" variant="tonal" class="w-100">
                  <div class="d-flex justify-space-between align-center font-weight-bold text-h6">
                    <span>Total Vales:</span>
                    <span>{{ formatCurrency(dashboardStore.totalVales) }}</span>
                  </div>
                </VAlert>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

  </div>
</template>
