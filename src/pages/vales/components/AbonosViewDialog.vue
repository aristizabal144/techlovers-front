<script setup lang="ts">
import { ref, watch } from 'vue'
import { $api } from '@/utils/api'

interface AbonoItem {
  id: number
  fecha: string
  estado: string
  valor: number
  descripcion: string
}

interface Props {
  modelValue: boolean
  ticketId: number | null
  ticketData: any
}

interface Emit {
  (e: 'update:modelValue', val: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const isLoading = ref(false)
const tableData = ref<AbonoItem[]>([])
const totalAbono = ref(0)

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const fetchAbonos = async () => {
  if (!props.ticketId) return

  isLoading.value = true
  try {
    const response = await $api<any>('/abonos-vales', {
      params: { id_vale: props.ticketId },
    })

    tableData.value = response.data || []
    totalAbono.value = 0
    tableData.value.forEach((item) => {
      totalAbono.value += item.valor
    })
  } catch (error) {
    console.error('Error fetching abonos:', error)
    tableData.value = []
    totalAbono.value = 0
  } finally {
    isLoading.value = false
  }
}

watch(() => props.modelValue, (val) => {
  if (val && props.ticketId) {
    fetchAbonos()
  }
})

const headers = [
  { title: 'Fecha', key: 'fecha', width: '120px' },
  { title: 'Tipo', key: 'estado', width: '150px' },
  { title: 'Valor', key: 'valor', width: '130px' },
  { title: 'Descripción', key: 'descripcion' },
]
</script>

<template>
  <VDialog
    :model-value="props.modelValue"
    max-width="700"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between pa-5 pb-2">
        <span class="text-h6">Resumen de Abonos</span>
        <VBtn
          icon="tabler-x"
          size="small"
          variant="text"
          color="secondary"
          @click="emit('update:modelValue', false)"
        />
      </VCardTitle>

      <VDivider />

      <VCardText class="pa-0">
        <VDataTable
          :headers="headers"
          :items="tableData"
          :loading="isLoading"
          density="compact"
          class="text-body-2"
          :items-per-page="-1"
          hide-default-footer
        >
          <!-- Tipo column -->
          <template #item.estado="{ item }">
            <VChip
              :color="item.estado === 'efectivo' ? 'success' : 'info'"
              size="small"
              variant="tonal"
            >
              {{ item.estado === 'efectivo' ? '🤑' : '💳' }}
              {{ item.estado?.toUpperCase() }}
            </VChip>
          </template>

          <!-- Valor column -->
          <template #item.valor="{ item }">
            <span class="font-weight-bold">{{ formatCurrency(item.valor) }}</span>
          </template>

          <!-- Empty state -->
          <template #no-data>
            <div class="text-center text-body-1 py-4">
              No hay abonos registrados para este vale
            </div>
          </template>
        </VDataTable>
      </VCardText>

      <VDivider />

      <!-- Total Footer -->
      <VCardText class="d-flex justify-space-between align-center py-4">
        <div>
          <span class="text-h6 text-error font-weight-bold">Total abonado:</span>
        </div>
        <div>
          <span class="text-h5 font-weight-bold">{{ formatCurrency(totalAbono) }}</span>
        </div>
      </VCardText>

      <VDivider />

      <!-- Vale info -->
      <VCardText v-if="props.ticketData" class="d-flex flex-wrap gap-6 py-3">
        <div class="d-flex flex-column">
          <span class="text-caption text-medium-emphasis">Valor del vale</span>
          <span class="font-weight-bold">{{ formatCurrency(props.ticketData?.valor || 0) }}</span>
        </div>
        <div class="d-flex flex-column">
          <span class="text-caption text-medium-emphasis">Pago faltante</span>
          <span class="font-weight-bold text-warning">{{ formatCurrency(props.ticketData?.faltante_pago || 0) }}</span>
        </div>
      </VCardText>

      <VCardActions class="pa-5 pt-2">
        <VSpacer />
        <VBtn
          color="secondary"
          variant="tonal"
          @click="emit('update:modelValue', false)"
        >
          Cerrar
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
