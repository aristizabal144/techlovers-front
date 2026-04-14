```html
<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface CategoryData {
  nombre: string
  descripcion: string
  estado: boolean
}

interface Props {
  isDrawerOpen: boolean
  editingCategoryId?: number | null
  initialData?: CategoryData
  isSubmitting?: boolean // Added for UX freeze
}

interface Emit {
  (e: 'update:isDrawerOpen', val: boolean): void
  (e: 'submit', data: CategoryData, id?: number | null): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const formForm = ref()
const formData = ref<CategoryData>({
  nombre: '',
  descripcion: '',
  estado: true,
})

// Validation rules
const requiredValidator = (val: string) => !!val || 'El campo es requerido'

const handleDrawerModelValueUpdate = (val: boolean) => {
  // Prevent closing if loading
  if (props.isSubmitting) return
  emit('update:isDrawerOpen', val)
}

const onSubmit = async () => {
  if (props.isSubmitting) return

  const { valid } = await formForm.value?.validate()
  if (valid) {
    emit('submit', formData.value, props.editingCategoryId)
  }
}

const resetForm = () => {
  formData.value = {
    nombre: '',
    descripcion: '',
    estado: true,
  }
  formForm.value?.resetValidation()
}

// Watch for whenever the drawer is opened or initial data changes to correctly populate the reactive form
watch(
  () => [props.isDrawerOpen, props.initialData],
  ([isOpen, newInitialData]) => {
    if (isOpen && props.editingCategoryId && newInitialData) {
      formData.value = { ...newInitialData as CategoryData }
    } else if (isOpen && !props.editingCategoryId) {
      resetForm()
    }
  },
  { deep: true }
)

const titleForm = computed(() => {
  return props.editingCategoryId ? 'Editar Categoría' : 'Nueva Categoría'
})

</script>

<template>
  <VNavigationDrawer
    :model-value="props.isDrawerOpen"
    temporary
    location="end"
    width="400"
    app
    class="v-navigation-drawer--temporary"
    style="z-index: 1010;"
    :scrim="!props.isSubmitting"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <!-- Overlay for freezing entire drawer while loading -->
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
        {{ titleForm }}
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
          ref="formForm"
          :disabled="props.isSubmitting"
          @submit.prevent="onSubmit"
        >
          <VRow>
            <!-- Name -->
            <VCol cols="12">
              <VTextField
                v-model="formData.nombre"
                label="Nombre de la categoría"
                :rules="[requiredValidator]"
                placeholder="Ej. Electrónica"
              />
            </VCol>

            <!-- Description -->
            <VCol cols="12">
              <VTextarea
                v-model="formData.descripcion"
                label="Descripción"
                placeholder="Descripción de la categoría"
                rows="3"
                auto-grow
              />
            </VCol>

            <!-- Status Switch -->
            <VCol cols="12">
              <div class="d-flex align-center gap-4">
                <span class="text-body-1">Estado</span>
                <VSwitch
                  v-model="formData.estado"
                  color="success"
                  :label="formData.estado ? 'Activo' : 'Inactivo'"
                />
              </div>
            </VCol>

            <!-- Action buttons -->
            <VCol cols="12" class="d-flex align-center mt-4">
              <VBtn
                type="submit"
                class="me-3"
                :loading="props.isSubmitting"
                :disabled="props.isSubmitting"
              >
                {{ props.editingCategoryId ? 'Actualizar' : 'Guardar' }}
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
