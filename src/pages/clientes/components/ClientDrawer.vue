<script setup lang="ts">
import { ref, watch } from 'vue'
import { $api } from '@/utils/api'
import { VForm } from 'vuetify/components/VForm'

interface ClientData {
  systemId?: string | number
  id: string | number
  name: string
  email: string
  cellNumber: string
  phoneNumber: string
  description: string
}

interface Props {
  isDrawerOpen: boolean
  isEditing: boolean
  clientData?: Partial<ClientData> | null
}

const props = defineProps<Props>()
const emit = defineEmits(['update:isDrawerOpen', 'clientSaved', 'showSnackbar'])

const isSubmitting = ref(false)
const formRef = ref<InstanceType<typeof VForm> | null>(null)

// Initial default state
const initialFormData: ClientData = {
  systemId: '',
  id: '',
  name: '',
  email: '',
  cellNumber: '',
  phoneNumber: '',
  description: ''
}

const formData = ref<ClientData>({ ...initialFormData })

// Validation Rules
const requiredValidator = (v: any) => !!v || 'Campo requerido'
const emailValidator = (v: string) => {
  if (!v) return true // Let requiredValidator handle empty check if needed
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(v) || 'Correo electrónico inválido'
}

// Watchers
watch(() => props.isDrawerOpen, (newVal) => {
  if (newVal) {
    if (props.isEditing && props.clientData) {
      const data = props.clientData as any
      formData.value = { 
        systemId: data.id || undefined,
        id: data.identificacion || '',
        name: data.nombre || '',
        email: data.correo || '',
        cellNumber: data.celular || '',
        phoneNumber: data.telefono_fijo || '',
        description: data.descripcion || ''
      } as ClientData
    } else {
      formData.value = { ...initialFormData }
    }
    // Deep resetting form validation errors visually when drawer opens
    setTimeout(() => {
      formRef.value?.resetValidation()
    }, 100)
  }
})

// Close Drawer Function
const closeDrawer = () => {
  emit('update:isDrawerOpen', false)
}

// Master Save Function (Handles both Create and Edit)
const handleFormSubmit = async () => {
  const { valid } = await formRef.value?.validate() || { valid: false }
  if (!valid) return

  isSubmitting.value = true

  try {
    if (props.isEditing) {
      // Legacy PUT expects /client/:id + Spanish Keys
      const editPayload = {
        identificacion: formData.value.id,
        nombre: formData.value.name,
        correo: formData.value.email,
        celular: formData.value.cellNumber,
        telefono_fijo: formData.value.phoneNumber || '',
        descripcion: formData.value.description || ''
      }

      const response = await $api(`/client/${formData.value.systemId}`, { 
        method: 'PUT', 
        body: editPayload 
      })
      
      if ((response as any).is_error) {
        throw new Error((response as any).message)
      }
      
      emit('showSnackbar', { message: 'Cliente actualizado correctamente', color: 'success' })
    } else {
      // Legacy POST expects /client + English Keys
      const createPayload = {
        id: formData.value.id,
        name: formData.value.name,
        email: formData.value.email,
        cellNumber: formData.value.cellNumber,
        phoneNumber: formData.value.phoneNumber || '',
        description: formData.value.description || ''
      }

      const response = await $api('/client', { 
        method: 'POST', 
        body: createPayload 
      })
      
      if ((response as any).is_error) {
        throw new Error((response as any).message)
      }
      
      emit('showSnackbar', { message: 'Cliente creado correctamente', color: 'success' })
    }

    emit('clientSaved')
    closeDrawer()
  } catch (error: any) {
    console.error('Error saving client:', error)
    emit('showSnackbar', { 
      message: error.response?._data?.message || error.message || 'Error de conexión', 
      color: 'error' 
    })
  } finally {
    isSubmitting.value = false
  }
}
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
    :scrim="!isSubmitting"
    @update:model-value="closeDrawer"
  >
    <!-- Drawer Header -->
    <div class="d-flex align-center pa-5 pb-4 border-b bg-var(--v-theme-surface)">
      <h3 class="text-h5 font-weight-bold">
        {{ props.isEditing ? 'Editar Cliente' : 'Nuevo Cliente' }}
      </h3>
      <VSpacer />
      <IconBtn @click="closeDrawer" class="bg-surface elevation-1" style="z-index: 10;">
        <VIcon icon="tabler-x" />
      </IconBtn>
    </div>

    <!-- Drawer Body -->
    <div class="pa-5 position-relative h-100 flex-grow-1" style="overflow-y: auto;">
      
      <!-- Loading Overlay blocking edits while sending -->
      <VOverlay :model-value="isSubmitting" contained class="align-center justify-center">
        <VProgressCircular indeterminate color="primary" />
      </VOverlay>

      <VForm
        ref="formRef"
        :disabled="isSubmitting"
        @submit.prevent="handleFormSubmit"
      >
        <VRow>
          <VCol cols="12">
            <VTextField
              v-model="formData.id"
              label="NIT / Documento Identidad"
              placeholder="Ej. 900123456-7"
              :rules="[requiredValidator]"
              variant="outlined"
              prepend-inner-icon="tabler-id"
            />
          </VCol>

          <VCol cols="12">
            <VTextField
              v-model="formData.name"
              label="Razón Social / Nombre Completo"
              placeholder="Ej. Transportes Zabal S.A.S"
              :rules="[requiredValidator]"
              variant="outlined"
            />
          </VCol>

          <VCol cols="12">
            <VTextField
              v-model="formData.email"
              label="Correo Electrónico"
              placeholder="Ej. facturacion@cliente.com"
              type="email"
              :rules="[requiredValidator, emailValidator]"
              variant="outlined"
              prepend-inner-icon="tabler-mail"
            />
          </VCol>

          <VCol cols="12" md="6">
            <VTextField
              v-model="formData.cellNumber"
              label="Celular Principal"
              placeholder="Ej. 300 123 4567"
              :rules="[requiredValidator]"
              variant="outlined"
              prepend-inner-icon="tabler-device-mobile"
            />
          </VCol>

          <VCol cols="12" md="6">
            <VTextField
              v-model="formData.phoneNumber"
              label="Teléfono Fijo"
              placeholder="Ej. (604) 123 4567"
              variant="outlined"
              prepend-inner-icon="tabler-phone"
            />
          </VCol>

          <VCol cols="12">
            <VTextarea
              v-model="formData.description"
              label="Dirección / Descripción / Notas Adicionales"
              placeholder="Ej. Calle 123 #45-67, Envigado"
              rows="3"
              auto-grow
              variant="outlined"
              prepend-inner-icon="tabler-map-pin"
            />
          </VCol>

          <!-- Drawer Action Footer -->
          <VCol cols="12" class="d-flex gap-4 pt-6">
            <VBtn
              type="submit"
              color="primary"
              class="flex-grow-1"
              :loading="isSubmitting"
            >
              Guardar Cliente
            </VBtn>
            <VBtn
              color="secondary"
              variant="tonal"
              class="flex-grow-1"
              @click="closeDrawer"
              :disabled="isSubmitting"
            >
              Cancelar
            </VBtn>
          </VCol>
        </VRow>
      </VForm>
    </div>
  </VNavigationDrawer>
</template>
