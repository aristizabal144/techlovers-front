<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  color?: string
}

const props = defineProps<Props>()
const emit = defineEmits(['confirm', 'cancel'])

const isVisible = ref(false)

const open = () => {
  isVisible.value = true
}

const close = () => {
  isVisible.value = false
  emit('cancel')
}

const confirm = () => {
  isVisible.value = false
  emit('confirm')
}

defineExpose({ open, close })
</script>

<template>
  <VDialog
    v-model="isVisible"
    max-width="500"
    persistent
  >
    <VCard class="text-center pa-6">
      <VCardText class="pa-0 mb-4">
        <!-- Warning Icon Native Vuetify/Vuexy -->
        <div class="d-flex justify-center mb-4">
          <VAvatar
            :color="props.color || 'error'"
            variant="tonal"
            size="80"
          >
            <VIcon
              icon="tabler-alert-triangle"
              size="40"
            />
          </VAvatar>
        </div>

        <!-- Title & Message -->
        <h3 class="text-h4 mb-2">
          {{ props.title || '¿Estás Seguro?' }}
        </h3>
        <p class="text-body-1 text-medium-emphasis">
          {{ props.message }}
        </p>
      </VCardText>

      <!-- Action Buttons -->
      <VCardActions class="justify-center gap-3 pa-0">
        <VBtn
          color="secondary"
          variant="tonal"
          @click="close"
          class="px-6"
        >
          {{ props.cancelText || 'Cancelar' }}
        </VBtn>
        <VBtn
          :color="props.color || 'error'"
          variant="elevated"
          @click="confirm"
          class="px-6"
        >
          {{ props.confirmText || 'Sí, Eliminar' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
