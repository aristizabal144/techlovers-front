<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  ticketId: number | null
}

interface Emit {
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const isSubmitting = ref(false)
const isError = ref(false)
const msgError = ref('')

const formData = ref({
  id_vale: null as number | null,
  estado: '',
  fecha: '',
  valor_abono: 0,
  descripcion: '',
})

const paymentOptions = [
  { title: 'Efectivo', value: 'efectivo' },
  { title: 'Transferencia', value: 'transferencia' },
]

// Currency formatting
const displayAbono = ref('')

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(value)
}

const onAbonoInput = (val: string) => {
  const raw = String(val).replace(/[^\d]/g, '')
  formData.value.valor_abono = raw ? Number(raw) : 0
  displayAbono.value = raw
}

const onAbonoBlur = () => {
  if (formData.value.valor_abono > 0) {
    displayAbono.value = formatCurrency(formData.value.valor_abono)
  }
}

const onAbonoFocus = () => {
  if (formData.value.valor_abono > 0) {
    displayAbono.value = String(formData.value.valor_abono)
  }
}

const resetForm = () => {
  formData.value = {
    id_vale: null,
    estado: '',
    fecha: '',
    valor_abono: 0,
    descripcion: '',
  }
  displayAbono.value = ''
  isError.value = false
  msgError.value = ''
}

watch(() => props.modelValue, (val) => {
  if (val) resetForm()
})

const validate = () => {
  if (!formData.value.estado) {
    isError.value = true
    msgError.value = 'Por favor seleccione un método de pago'
    return false
  }
  if (!formData.value.fecha) {
    isError.value = true
    msgError.value = 'Por favor ingrese una fecha'
    return false
  }
  if (!formData.value.valor_abono || formData.value.valor_abono <= 0) {
    isError.value = true
    msgError.value = 'Por favor ingrese un monto mayor a 0'
    return false
  }
  isError.value = false
  msgError.value = ''
  return true
}

const saveAbono = async () => {
  if (!validate() || !props.ticketId) return

  isSubmitting.value = true
  try {
    formData.value.id_vale = props.ticketId
    const { $api } = await import('@/utils/api')
    const response = await $api<any>('/abonos-vales', {
      method: 'POST',
      body: formData.value,
    })

    if (response.is_error) {
      isError.value = true
      msgError.value = response.message || 'Error al guardar el abono'
      return
    }

    emit('update:modelValue', false)
    emit('saved')
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
    max-width="520"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between pa-5 pb-2">
        <span class="text-h6">Registrar Abono</span>
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
          <VCol cols="12" sm="6">
            <VSelect
              v-model="formData.estado"
              :items="paymentOptions"
              label="Método de pago"
              placeholder="Seleccione"
            />
          </VCol>

          <VCol cols="12" sm="6">
            <VTextField
              v-model="formData.fecha"
              label="Fecha"
              type="date"
            />
          </VCol>

          <VCol cols="12">
            <VTextField
              :model-value="displayAbono"
              label="Valor a abonar"
              prefix="$"
              placeholder="Ingrese el monto"
              @update:model-value="onAbonoInput"
              @blur="onAbonoBlur"
              @focus="onAbonoFocus"
            />
          </VCol>

          <VCol cols="12">
            <VTextarea
              v-model="formData.descripcion"
              label="Descripción"
              placeholder="Descripción del abono (opcional)"
              rows="3"
              auto-grow
            />
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
          color="primary"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="saveAbono"
        >
          Guardar Abono
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
