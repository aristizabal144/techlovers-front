<script setup lang="ts">
import { useAuthStore } from '@/stores/useAuthStore'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import techloversIllustration from '@images/pages/techlovers-illustration.png'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

definePage({
  meta: {
    layout: 'blank',
    public: true,
  },
})

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  email: '',
  password: '',
})

const isPasswordVisible = ref(false)
const isLoading = ref(false)

// Snackbar State
const isSnackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('error')

const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

import { onMounted } from 'vue'

onMounted(() => {
  if (router.currentRoute.value.query.sessionExpired) {
    snackbarMessage.value = 'Tu sesión ha expirado o no estás autorizado. Por favor ingresa de nuevo.'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
    
    // Clean up query param so refreshes don't show the error again
    router.replace({ query: {} })
  }
})

const handleLogin = async () => {
  isLoading.value = true
  isSnackbarVisible.value = false

  const result = await authStore.login({
    email: form.value.email,
    password: form.value.password,
  })

  isLoading.value = false

  if (!result.success) {
    snackbarMessage.value = result.message || 'Error al iniciar sesión'
    snackbarColor.value = 'error'
    isSnackbarVisible.value = true
  }
  else {
    snackbarMessage.value = 'Ingreso exitoso'
    snackbarColor.value = 'success'
    isSnackbarVisible.value = true
    
    setTimeout(() => {
      const currentRole = String(authStore.auth?.rol || localStorage.getItem('app-current-role'))
      if (currentRole === '3') {
        router.push('/cotizaciones')
      } else if (currentRole === '2') {
        router.push('/categorias')
      } else {
        router.push('/')
      }
    }, 1000)
  }
}
</script>

<template>
  <a href="javascript:void(0)">
    <div class="auth-logo d-flex align-center gap-x-3">
      <VNodeRenderer :nodes="themeConfig.app.logo" />
      <h1 class="auth-title">
        {{ themeConfig.app.title }}
      </h1>
    </div>
  </a>

  <VRow
    no-gutters
    class="auth-wrapper bg-surface"
  >
    <VCol
      md="8"
      class="d-none d-md-flex align-center justify-center position-relative overflow-hidden"
      style="background: linear-gradient(135deg, #0A051D 0%, #331791 100%);"
    >
      <img
        class="auth-illustration w-100 h-100"
        style="object-fit: contain; padding: 2rem; max-width: 800px; z-index: 1; mix-blend-mode: screen;"
        :src="techloversIllustration"
        alt="techlovers-illustration"
      >

      <img
        class="auth-footer-mask flip-in-rtl"
        :src="authThemeMask"
        alt="auth-footer-mask"
        height="280"
        width="100"
        style="position: absolute; bottom: 0; left: 0; pointer-events: none; opacity: 0.3;"
      >
    </VCol>

    <VCol
      cols="12"
      md="4"
      class="auth-card-v2 d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-6"
      >
        <VCardText>
          <h4 class="text-h4 mb-1">
            Ingreso al sistema 👋🏻
          </h4>
          <p class="mb-0">
            Ingrese las credenciales del sistema para continuar
          </p>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="handleLogin">
            <VRow>
              <!-- email -->
              <VCol cols="12">
                <AppTextField
                  v-model="form.email"
                  autofocus
                  label="Usuario"
                  type="text"
                  placeholder="ejemplo@correo.com"
                  required
                />
              </VCol>

              <!-- password -->
              <VCol cols="12">
                <AppTextField
                  v-model="form.password"
                  label="Contraseña"
                  placeholder="············"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  autocomplete="current-password"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                  required
                />

                <div class="d-flex align-center justify-end mt-2 mb-6">
                  <a
                    class="text-primary"
                    href="javascript:void(0)"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                <VBtn
                  block
                  type="submit"
                  :loading="isLoading"
                  :disabled="isLoading"
                >
                  Verificar y Continuar
                </VBtn>
              </VCol>

            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- Snackbar for Error/Success Messages -->
  <VSnackbar
    v-model="isSnackbarVisible"
    :color="snackbarColor"
    location="top end"
    :timeout="3000"
  >
    {{ snackbarMessage }}
    
    <template #actions>
      <VBtn
        color="white"
        variant="text"
        icon="tabler-x"
        @click="isSnackbarVisible = false"
      />
    </template>
  </VSnackbar>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";

// Makes auth-title white on desktop against the colored background
@media (min-width: 960px) {
  .auth-title {
    color: white !important;
  }
}
</style>
