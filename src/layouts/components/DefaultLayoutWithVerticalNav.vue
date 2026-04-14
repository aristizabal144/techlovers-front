<script lang="ts" setup>
import navItems from '@/navigation/vertical'
import { useAuthStore } from '@/stores/useAuthStore'
import { themeConfig } from '@themeConfig'
import { computed } from 'vue'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import NavBarI18n from '@core/components/I18n.vue'

// @layouts plugin
import { VerticalNavLayout } from '@layouts'

const authStore = useAuthStore()

// Filter navigation items based on the user's role.
const filteredNavItems = computed(() => {
  const currentRole = Number(authStore.auth?.rol || localStorage.getItem('app-current-role'))

  return navItems.filter((item: any) => {
    // Keep headers (they don't have 'to' or 'allowedRoles') but filter out empty groups later if needed
    if (item.heading)
      return true

    // If no roles are specified, the item is allowed for everyone
    if (!item.allowedRoles || item.allowedRoles.length === 0)
      return true

    // Allow if the user's role is in the item's allowedRoles array
    return item.allowedRoles.includes(currentRole)
  })
})
</script>

<template>
  <VerticalNavLayout :nav-items="filteredNavItems">
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <IconBtn
          id="vertical-nav-toggle-btn"
          class="ms-n3 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon
            size="26"
            icon="tabler-menu-2"
          />
        </IconBtn>

        <NavbarThemeSwitcher />

        <VSpacer />

        <NavBarI18n
          v-if="themeConfig.app.i18n.enable && themeConfig.app.i18n.langConfig?.length"
          :languages="themeConfig.app.i18n.langConfig"
        />
        <UserProfile />
      </div>
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <!-- <TheCustomizer /> -->
  </VerticalNavLayout>
</template>
