<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { VForm } from 'vuetify/components/VForm'
import { requiredValidator } from '@core/utils/validators'
import { $api } from '@/utils/api'

interface Props {
  isDrawerOpen: boolean
  isEditing: boolean
  warehouseData?: any
}

const props = defineProps<Props>()
const emit = defineEmits(['update:isDrawerOpen', 'warehouse-saved', 'show-snackbar'])

const isSubmitting = ref(false)
const refVForm = ref<VForm>()

// API search states
const customers = ref<any[]>([])
const cities = ref<any[]>([])
const isSearchingCustomer = ref(false)
const isSearchingCity = ref(false)

// Internal Search Models
const customerSearchInput = ref('')
const citySearchInput = ref('')

const initialFormData = {
  id: null as number | null,
  id_cliente: null as number | null,
  nit: '',
  nombre: '',
  encargado: '',
  ciudad: '',
  barrio: '',
  direccion: '',
  telefono: '',
  descripcion: ''
}

const formData = ref({ ...initialFormData })

// Handle Drawer State / Reset
const closeNavigationDrawer = () => {
  emit('update:isDrawerOpen', false)
  nextTick(() => {
    refVForm.value?.reset()
    refVForm.value?.resetValidation()
    customerSearchInput.value = ''
    citySearchInput.value = ''
  })
}

const handleDrawerModelValueUpdate = (val: boolean) => {
  emit('update:isDrawerOpen', val)
}

// Watchers
watch(() => props.isDrawerOpen, (isOpen) => {
  if (isOpen) {
    if (props.isEditing && props.warehouseData) {
      formData.value = {
        id: props.warehouseData.id,
        id_cliente: props.warehouseData.id_cliente,
        nit: props.warehouseData.nit,
        nombre: props.warehouseData.nombre,
        encargado: props.warehouseData.encargado,
        ciudad: props.warehouseData.ciudad,
        barrio: props.warehouseData.barrio,
        direccion: props.warehouseData.direccion,
        telefono: props.warehouseData.telefono,
        descripcion: props.warehouseData.descripcion
      }
      
      // Auto-populate autocomplete visual inputs
      if (props.warehouseData.cliente) {
        const client = props.warehouseData.cliente
        client.id = Number(client.id)
        customerSearchInput.value = client.nombre
        customers.value = [client]
      } else if (props.warehouseData.id_cliente) {
        isSearchingCustomer.value = true
        $api<any>(`/client/${props.warehouseData.id_cliente}`)
          .then(res => {
            const clientData = res.data || res
            if (clientData && clientData.id) {
              clientData.id = Number(clientData.id)
              customerSearchInput.value = clientData.nombre
              customers.value = [clientData]
            }
          })
          .catch(e => console.error('Error fetching client info:', e))
          .finally(() => isSearchingCustomer.value = false)
      }
      citySearchInput.value = props.warehouseData.ciudad
      
      // Force formData id_cliente to be a number so it strictly matches the autocomplete item-value
      formData.value.id_cliente = props.warehouseData.id_cliente ? Number(props.warehouseData.id_cliente) : null
    } else {
      formData.value = { ...initialFormData }
      customerSearchInput.value = ''
      citySearchInput.value = ''
      customers.value = []
    }
  }
})

// Autocomplete Handlers
const searchCustomers = async (query: string) => {
  if (!query) return
  isSearchingCustomer.value = true
  try {
    const response = await $api<any>('/client/client-search', {
      params: { input: query, size: 20 }
    })
    const items = response.data || []
    items.forEach((item: any) => { item.id = Number(item.id) })
    customers.value = items
  } catch (error) {
    console.error('Error fetching customers:', error)
  } finally {
    isSearchingCustomer.value = false
  }
}

const searchCities = async (query: string) => {
  if (!query) return
  isSearchingCity.value = true
  try {
    const response = await $api<any>('/ciudades-search', {
      params: { input: query }
    })
    cities.value = response?.data || response || []
  } catch (error) {
    console.error('Error fetching cities:', error)
  } finally {
    isSearchingCity.value = false
  }
}

// Submit Logic
const onSubmit = async () => {
  const { valid } = await refVForm.value!.validate()
  if (!valid) return

  isSubmitting.value = true

  try {
    const method = props.isEditing ? 'PUT' : 'POST'
    const endpoint = props.isEditing ? `/store/${formData.value.id}` : '/store'
    
    // Legacy API Expects wrapped array for POST but standard object for PUT
    let payload: any = {}
    
    if (method === 'POST') {
       payload = {
         stores: [
           {
             id_cliente: formData.value.id_cliente,
             nit: formData.value.nit,
             nombre: formData.value.nombre,
             encargado: formData.value.encargado,
             ciudad: formData.value.ciudad,
             barrio: formData.value.barrio,
             direccion: formData.value.direccion,
             telefono: formData.value.telefono,
             descripcion: formData.value.descripcion
           }
         ]
       }
    } else {
       payload = {
          id_cliente: formData.value.id_cliente,
          nit: formData.value.nit,
          nombre: formData.value.nombre,
          encargado: formData.value.encargado,
          ciudad: formData.value.ciudad,
          barrio: formData.value.barrio,
          direccion: formData.value.direccion,
          telefono: formData.value.telefono,
          descripcion: formData.value.descripcion
       }
    }

    const response = await $api<any>(endpoint, { method, body: payload })

    if (response && response.is_error) {
       emit('show-snackbar', { message: response.message || 'Error del servidor al guardar', color: 'error' })
       return
    }

    emit('show-snackbar', { 
      message: props.isEditing ? 'Almacén actualizado con éxito' : 'Almacén creado exitosamente', 
      color: 'success' 
    })
    emit('warehouse-saved')
    closeNavigationDrawer()

  } catch (error: any) {
    console.error(error)
    const errorMsg = error.response?._data?.message || 'Error de conexión al guardar el almacén'
    emit('show-snackbar', { message: errorMsg, color: 'error' })
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
    width="500"
    @update:model-value="handleDrawerModelValueUpdate"
    app
    :scrim="!isSubmitting"
  >
    <!-- Blocking Overlay while Submitting -->
    <VOverlay
      :model-value="isSubmitting"
      contained
      persistent
      class="align-center justify-center bg-white"
      opacity="0.75"
    >
      <VProgressCircular indeterminate color="primary" size="64" />
    </VOverlay>

    <div class="d-flex flex-column h-100">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between px-6 py-4 border-b">
        <h5 class="text-h5 font-weight-medium">
          {{ props.isEditing ? 'Editar Almacén' : 'Nuevo Almacén' }}
        </h5>
        <IconBtn @click="closeNavigationDrawer">
          <VIcon icon="tabler-x" />
        </IconBtn>
      </div>

      <VDivider />

      <!-- Scrollable Form -->
      <div class="flex-grow-1 overflow-y-auto px-6 py-6">
        <VForm ref="refVForm" @submit.prevent="onSubmit">
          <VRow>
            <!-- Cliente (Crucial) -->
            <VCol cols="12">
              <VAutocomplete
                v-model="formData.id_cliente"
                v-model:search="customerSearchInput"
                :items="customers"
                :loading="isSearchingCustomer"
                item-title="nombre"
                item-value="id"
                label="Cliente Dueño (Obligatorio)"
                placeholder="Busque por nombre o NIT"
                variant="outlined"
                density="comfortable"
                :rules="[requiredValidator]"
                @update:search="searchCustomers"
                clearable
                no-data-text="Ingrese nombre para buscar"
              >
                <!-- Display full info in dropdown list -->
                <template #item="{ props, item }">
                  <VListItem
                    v-bind="props"
                    :title="item.raw.nombre"
                    :subtitle="`NIT: ${item.raw.identificacion}`"
                  />
                </template>
              </VAutocomplete>
            </VCol>

            <VCol cols="12" md="6">
              <VTextField
                v-model="formData.nit"
                label="NIT Almacén"
                variant="outlined"
                density="comfortable"
                :rules="[requiredValidator]"
              />
            </VCol>

            <VCol cols="12" md="6">
              <VTextField
                v-model="formData.nombre"
                label="Nombre Almacén"
                variant="outlined"
                density="comfortable"
                :rules="[requiredValidator]"
              />
            </VCol>

            <VCol cols="12">
              <VTextField
                v-model="formData.encargado"
                label="Nombre del Encargado"
                variant="outlined"
                density="comfortable"
                :rules="[requiredValidator]"
                prepend-inner-icon="tabler-user"
              />
            </VCol>

            <VCol cols="12" md="6">
              <VAutocomplete
                v-model="formData.ciudad"
                v-model:search="citySearchInput"
                :items="cities"
                :loading="isSearchingCity"
                item-title="nombre"
                item-value="nombre"
                label="Ciudad"
                variant="outlined"
                density="comfortable"
                :rules="[requiredValidator]"
                @update:search="searchCities"
                no-data-text="Escriba para buscar ciudad"
              />
            </VCol>

            <VCol cols="12" md="6">
              <VTextField
                v-model="formData.barrio"
                label="Barrio / Sector"
                variant="outlined"
                density="comfortable"
                :rules="[requiredValidator]"
              />
            </VCol>

            <VCol cols="12">
              <VTextField
                v-model="formData.direccion"
                label="Dirección Física"
                variant="outlined"
                density="comfortable"
                :rules="[requiredValidator]"
                prepend-inner-icon="tabler-map-pin"
              />
            </VCol>
            
            <VCol cols="12">
              <VTextField
                v-model="formData.telefono"
                label="Teléfono(s)"
                variant="outlined"
                density="comfortable"
                :rules="[requiredValidator]"
                prepend-inner-icon="tabler-phone"
              />
            </VCol>

            <VCol cols="12">
              <VTextarea
                v-model="formData.descripcion"
                label="Descripción / Notas"
                variant="outlined"
                density="comfortable"
                :rules="[requiredValidator]"
                rows="3"
                auto-grow
              />
            </VCol>

          </VRow>

          <!-- Fixed Footer Buttons -->
          <div class="d-flex justify-end gap-3 mt-8 pb-4">
            <VBtn
              color="secondary"
              variant="tonal"
              @click="closeNavigationDrawer"
            >
              Cancelar
            </VBtn>
            <VBtn
              type="submit"
              color="primary"
            >
              Guardar Almacén
            </VBtn>
          </div>
        </VForm>
      </div>
    </div>
  </VNavigationDrawer>
</template>
