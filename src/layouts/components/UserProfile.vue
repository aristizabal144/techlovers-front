<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const roleMap: Record<number | string, string> = {
  1: 'Admin',
  2: 'Vendedor',
  3: 'Secretaria'
}

const userData = computed(() => {
  const data = localStorage.getItem('userData')
  if (data) {
    try {
      const decoded = JSON.parse(data)
      const numericRole = decoded.rol || decoded.role || 1
      return { 
        name: decoded.name || decoded._name || 'Usuario', 
        role: roleMap[numericRole] || 'Admin' 
      }
    } catch {
      return { name: 'Usuario', role: 'Admin' }
    }
  }
  return { name: 'Usuario', role: 'Admin' }
})

const logout = () => {
  localStorage.removeItem('app-token')
  localStorage.removeItem('userData')
  router.push('/login')
}
</script>

<template>
  <VBadge
    dot
    location="bottom right"
    offset-x="3"
    offset-y="3"
    bordered
    color="success"
  >
    <VAvatar
      class="cursor-pointer"
      color="error"
      variant="flat"
    >
      <VIcon icon="tabler-user" color="white" />

      <!-- SECTION Menu -->
      <VMenu
        activator="parent"
        width="230"
        location="bottom end"
        offset="14px"
      >
        <VList>
          <!-- 👉 User Avatar & Name -->
          <VListItem>
            <template #prepend>
              <VListItemAction start>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                >
                  <VAvatar
                    color="error"
                    variant="flat"
                  >
                    <VIcon icon="tabler-user" color="white" />
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold">
              {{ userData.name }}
            </VListItemTitle>
            <VListItemSubtitle>{{ userData.role }}</VListItemSubtitle>
          </VListItem>

          <VDivider class="my-2" />

          <!-- 👉 Logout -->
          <VListItem @click="logout" style="cursor: pointer;">
            <template #prepend>
              <VIcon
                class="me-2"
                icon="tabler-logout"
                size="22"
              />
            </template>

            <VListItemTitle>Cerrar Sesión</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
</template>
