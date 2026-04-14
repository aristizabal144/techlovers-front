<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  ticketId: number | null
  ticketData: any
}

interface Emit {
  (e: 'update:modelValue', val: boolean): void
  (e: 'paid'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const isSubmitting = ref(false)
const isError = ref(false)
const msgError = ref('')

const formData = ref({
  fecha: '',
  estado: '',
})

const paymentOptions = [
  { title: 'Efectivo', value: 'efectivo' },
  { title: 'Transferencia', value: 'transferencia' },
]

const resetForm = () => {
  formData.value = { fecha: '', estado: '' }
  isError.value = false
  msgError.value = ''
}

watch(() => props.modelValue, (val) => {
  if (val) resetForm()
})

const validate = () => {
  if (!formData.value.fecha) {
    isError.value = true
    msgError.value = 'Por favor ingrese una fecha'
    return false
  }
  if (!formData.value.estado) {
    isError.value = true
    msgError.value = 'Por favor seleccione un método de pago'
    return false
  }
  isError.value = false
  msgError.value = ''
  return true
}

const changeStatus = async () => {
  if (!validate() || !props.ticketId) return

  isSubmitting.value = true
  try {
    const { $api } = await import('@/utils/api')
    const response = await $api<any>('/vales/change-status', {
      method: 'POST',
      body: {
        id: props.ticketId,
        fecha: formData.value.fecha,
        estado: formData.value.estado,
        restante_pago: props.ticketData?.faltante_pago || 0,
      },
    })

    if (response.is_error) {
      isError.value = true
      msgError.value = response.message || 'Error al procesar el pago'
      return
    }

    emit('update:modelValue', false)
    emit('paid')
  } catch (error: any) {
    isError.value = true
    msgError.value = error.response?._data?.message || error.data?.message || 'Error de conexión'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <VDialog
    :model-value="props.modelValue"
    max-width="500"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between pa-5 pb-2">
        <span class="text-h6">Pago de Vale</span>
        <VBtn
          icon="tabler-x"
          size="small"
          variant="text"
          color="secondary"
          @click="emit('update:modelValue', false)"
        />
      </VCardTitle>

      <VDivider />

      <VCardText class="pt-5">
        <VAlert
          v-if="isError"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ msgError }}
        </VAlert>

        <VRow>
          <VCol cols="12">
            <VTextField
              v-model="formData.fecha"
              label="Fecha de pago"
              type="date"
            />
          </VCol>

          <VCol cols="12">
            <VSelect
              v-model="formData.estado"
              :items="paymentOptions"
              label="Método de pago"
              placeholder="Seleccione"
            />
          </VCol>

          <VCol v-if="props.ticketData" cols="12">
            <VAlert type="info" variant="tonal" density="compact">
              <strong>Pago restante:</strong>
              {{ new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(props.ticketData?.faltante_pago || 0) }}
            </VAlert>
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions class="pa-5 pt-0">
        <VSpacer />
        <VBtn
          color="secondary"
          variant="tonal"
          :disabled="isSubmitting"
          @click="emit('update:modelValue', false)"
        >
          Cancelar
        </VBtn>
        <VBtn
          color="success"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="changeStatus"
        >
          Pagar
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
