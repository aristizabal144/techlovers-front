<script setup lang="ts">
import { useAuthStore } from '@/stores/useAuthStore'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
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
      style="background: linear-gradient(135deg, #1A0808 0%, #AE3839 100%);"
    >
      <!-- Abstract CSS Dashboard Scene -->
      <div class="abstract-dashboard-scene">
        
        <!-- Center Main Container representing the Platform -->
        <div class="abstract-main-panel glass-panel">
          <div class="panel-header">
            <div class="dot-group">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
            <div class="line-skeleton short"></div>
          </div>
          <div class="panel-body">
            <div class="chart-bars">
              <div class="bar h-60"></div>
              <div class="bar h-40"></div>
              <div class="bar h-80"></div>
              <div class="bar h-30 text-error"></div>
              <div class="bar h-100"></div>
              <div class="bar h-50"></div>
            </div>
          </div>
        </div>

        <!-- Floating Card 1: Data Table -->
        <div class="abstract-floating-card card-table float-delay-1 glass-panel">
          <div class="line-skeleton medium mb-3"></div>
          <div class="table-row">
            <div class="circle-skeleton"></div>
            <div class="line-skeleton long"></div>
          </div>
          <div class="table-row">
            <div class="circle-skeleton"></div>
            <div class="line-skeleton long"></div>
          </div>
          <div class="table-row">
            <div class="circle-skeleton"></div>
            <div class="line-skeleton long"></div>
          </div>
        </div>

        <!-- Floating Card 2: Stats Metric -->
        <div class="abstract-floating-card card-stats float-delay-2 glass-panel">
          <div class="icon-avatar">
            <VIcon icon="tabler-currency-dollar" color="success" size="24" />
          </div>
          <div class="stats-info">
            <div class="line-skeleton short mt-2"></div>
            <div class="line-skeleton thick medium mt-2"></div>
          </div>
        </div>

        <!-- Floating Card 3: Logistics Route -->
        <div class="abstract-floating-card card-route float-delay-3 glass-panel">
          <div class="route-nodes">
            <div class="node origin"></div>
            <div class="path-line"></div>
            <div class="node destination"></div>
          </div>
          <div class="line-skeleton full mt-4"></div>
        </div>

      </div>

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

// --- Abstract Floating Dashboard Styles ---

.abstract-dashboard-scene {
  position: relative;
  width: 600px;
  height: 500px;
  perspective: 1000px;
  transform-style: preserve-3d;
}

.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  padding: 1.5rem;
}

.abstract-main-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotateX(10deg) rotateY(-15deg);
  width: 450px;
  height: 320px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
    
    .dot-group {
      display: flex;
      gap: 6px;
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255,255,255,0.3);
      }
    }
  }

  .panel-body {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 15px;
    padding: 1rem 0;
    
    .chart-bars {
      display: flex;
      align-items: flex-end;
      width: 100%;
      height: 100%;
      gap: 20px;
      
      .bar {
        flex: 1;
        background: rgba(255, 255, 255, 0.4);
        border-radius: 4px 4px 0 0;
        transition: height 1s ease;
        
        &.h-30 { height: 30%; }
        &.h-40 { height: 40%; }
        &.h-50 { height: 50%; }
        &.h-60 { height: 60%; }
        &.h-80 { height: 80%; }
        &.h-100 { height: 100%; background: #fff; box-shadow: 0 0 15px rgba(255,255,255,0.5); }
        &.text-error { background: #ff4c51; }
      }
    }
  }
}

.abstract-floating-card {
  position: absolute;
  animation: float 6s ease-in-out infinite;

  &.card-table {
    top: 5%;
    right: -5%;
    width: 280px;
    transform: translateZ(50px) rotateX(5deg) rotateY(-10deg);
    
    .table-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      &:last-child { margin-bottom: 0; }
    }
  }

  &.card-stats {
    bottom: 5%;
    left: -10%;
    width: 200px;
    transform: translateZ(80px) rotateX(15deg) rotateY(10deg);
    
    .icon-avatar {
      width: 45px;
      height: 45px;
      border-radius: 12px;
      background: rgba(40, 199, 111, 0.15); // Success color tint
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  &.card-route {
    bottom: -5%;
    right: 15%;
    width: 240px;
    transform: translateZ(60px) rotateX(-10deg) rotateY(-5deg);
    
    .route-nodes {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      
      .node {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,0.9);
        background: transparent;
        z-index: 2;
        
        &.origin { background: #AE3839; }
        &.destination { background: #28c76f; }
      }
      
      .path-line {
        position: absolute;
        top: 50%;
        left: 10px;
        right: 10px;
        height: 2px;
        background: rgba(255,255,255,0.3);
        border-top: 2px dashed rgba(255,255,255,0.6);
        z-index: 1;
        transform: translateY(-50%);
      }
    }
  }
}

// Skeletons
.line-skeleton {
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  
  &.short { width: 30%; }
  &.medium { width: 60%; }
  &.long { width: 85%; }
  &.full { width: 100%; }
  &.thick { height: 14px; }
}

.circle-skeleton {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

// Animations
@keyframes float {
  0% { transform: translateY(0px) translateZ(inherit) rotateX(inherit) rotateY(inherit); }
  50% { transform: translateY(-15px) translateZ(inherit) rotateX(inherit) rotateY(inherit); }
  100% { transform: translateY(0px) translateZ(inherit) rotateX(inherit) rotateY(inherit); }
}

.float-delay-1 { animation-delay: -2s; }
.float-delay-2 { animation-delay: -4s; }
.float-delay-3 { animation-delay: -1s; }

// Makes auth-title white on desktop against the red background
@media (min-width: 960px) {
  .auth-title {
    color: white !important;
  }
}
</style>
