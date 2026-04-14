<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface ValeData {
  fecha: string
  valor: number | null
  id_usuario: number | null
}

interface UserOption {
  id: number
  name: string
}

interface Props {
  isDrawerOpen: boolean
  isSubmitting?: boolean
  users: UserOption[]
}

interface Emit {
  (e: 'update:isDrawerOpen', val: boolean): void
  (e: 'submit', data: ValeData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const formRef = ref()
const formData = ref<ValeData>({
  fecha: '',
  valor: null,
  id_usuario: null,
})

// Currency formatting
const displayValor = ref('')

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(value)
}

const onValorInput = (val: string) => {
  const raw = String(val).replace(/[^\d]/g, '')
  formData.value.valor = raw ? Number(raw) : null
  displayValor.value = raw
}

const onValorBlur = () => {
  if (formData.value.valor) {
    displayValor.value = formatCurrency(formData.value.valor)
  }
}

const onValorFocus = () => {
  if (formData.value.valor) {
    displayValor.value = String(formData.value.valor)
  }
}

const valorRequired = (_: any) => (formData.value.valor !== null && formData.value.valor > 0) || 'Ingrese un valor mayor a 0'

const requiredValidator = (val: any) => !!val || 'El campo es requerido'

const handleDrawerModelValueUpdate = (val: boolean) => {
  if (props.isSubmitting) return
  emit('update:isDrawerOpen', val)
}

const onSubmit = async () => {
  if (props.isSubmitting) return
  const { valid } = await formRef.value?.validate()
  if (valid) {
    emit('submit', formData.value)
  }
}

const resetForm = () => {
  formData.value = {
    fecha: '',
    valor: null,
    id_usuario: null,
  }
  displayValor.value = ''
  formRef.value?.resetValidation()
}

watch(
  () => props.isDrawerOpen,
  (isOpen) => {
    if (isOpen) {
      resetForm()
    }
  }
)
</script>

<template>
  <VNavigationDrawer
    :model-value="props.isDrawerOpen"
    temporary
    location="end"
    width="420"
    app
    class="v-navigation-drawer--temporary"
    style="z-index: 1010;"
    :scrim="!props.isSubmitting"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <!-- Loading overlay -->
    <VOverlay
      :model-value="props.isSubmitting"
      contained
      persistent
      class="align-center justify-center"
      style="z-index: 10"
    >
      <VProgressCircular indeterminate color="primary" size="48" />
    </VOverlay>

    <div class="d-flex align-center pa-6 pb-1">
      <h6 class="text-h6">
        Nuevo Vale
      </h6>
      <VSpacer />
      <VBtn
        icon="tabler-x"
        size="small"
        color="secondary"
        variant="text"
        :disabled="props.isSubmitting"
        @click="emit('update:isDrawerOpen', false)"
      />
    </div>

    <VDivider class="mt-4" />

    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCardText class="pt-5">
        <VForm
          ref="formRef"
          :disabled="props.isSubmitting"
          @submit.prevent="onSubmit"
        >
          <VRow>
            <!-- Fecha -->
            <VCol cols="12">
              <VTextField
                v-model="formData.fecha"
                label="Fecha"
                type="date"
                :rules="[requiredValidator]"
              />
            </VCol>

            <!-- Valor -->
            <VCol cols="12">
              <VTextField
                :model-value="displayValor"
                label="Valor"
                placeholder="Ingrese el valor del vale"
                :rules="[valorRequired]"
                prefix="$"
                @update:model-value="onValorInput"
                @blur="onValorBlur"
                @focus="onValorFocus"
              />
            </VCol>

            <!-- Responsable -->
            <VCol cols="12">
              <VSelect
                v-model="formData.id_usuario"
                :items="props.users"
                item-title="name"
                item-value="id"
                label="Responsable"
                placeholder="Seleccione un usuario"
                :rules="[requiredValidator]"
              />
            </VCol>

            <!-- Action buttons -->
            <VCol cols="12" class="d-flex align-center mt-4">
              <VBtn
                type="submit"
                class="me-3"
                :loading="props.isSubmitting"
                :disabled="props.isSubmitting"
              >
                Guardar
              </VBtn>
              <VBtn
                color="secondary"
                variant="tonal"
                :disabled="props.isSubmitting"
                @click="emit('update:isDrawerOpen', false)"
              >
                Cancelar
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </PerfectScrollbar>
  </VNavigationDrawer>
</template>
