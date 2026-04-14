<route lang="yaml">
meta:
  layout: blank
</route>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { $api } from '@/utils/api'

const products = ref<any[]>([])
const isLoading = ref(true)
const currentYear = new Date().getFullYear()

// Fetch all the catalog products without pagination
const fetchCatalog = async () => {
  try {
    isLoading.value = true
    const response = await $api<any>('/product/getCatalog')
    products.value = response.data || []
    
    // Wait for Vue to render the DOM with the images
    await nextTick()
    
    // Once images are largely painted, trigger the print dialog
    setTimeout(() => {
      window.print()
    }, 1500) // Small delay to ensure browser loads remote image URLs
    
  } catch (error) {
    console.error('Error fetching catalog data:', error)
  } finally {
    isLoading.value = false
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

onMounted(() => {
  fetchCatalog()
})
</script>

<template>
  <div class="catalog-print-container">
    <!-- Premium Cover Page -->
    <div class="print-header-wrapper d-flex align-center justify-center relative">
      <div class="print-header-frame d-flex flex-column align-center justify-center text-center">
        <!-- Decorative Elements -->
        <div class="header-accent-top"></div>
        <div class="header-accent-bottom"></div>
        
        <VIcon icon="tabler-building-store" size="100" color="primary" class="mb-6 z-1" />
        <h1 class="text-h2 font-weight-black mb-2 text-primary letter-spacing-3 z-1" style="text-transform: uppercase;">
          Catálogo Oficial
        </h1>
        <h2 class="text-h4 font-weight-bold mb-8 text-high-emphasis z-1 letter-spacing-2">
          ZABAL STORE
        </h2>
        
        <div class="divider-ornament bg-primary mb-8 z-1"></div>
        
        <h3 class="text-h5 text-medium-emphasis z-1 font-weight-medium">
          Colección {{ currentYear }}
        </h3>
        <p class="mt-4 text-body-1 text-disabled z-1">
          Excelencia y calidad garantizada
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="d-flex flex-column align-center justify-center align-self-center mt-16 pt-16" style="height: 50vh;">
      <VProgressCircular indeterminate color="primary" size="80" width="6" class="mb-6"></VProgressCircular>
      <h2 class="text-h4 font-weight-bold text-primary">Generando Catálogo...</h2>
      <p class="text-body-1 text-medium-emphasis mt-2">Por favor espere, descargando todos los productos...</p>
    </div>

    <!-- Printable Grid (2 massive items per page) -->
    <div v-else class="catalog-grid">
      <div 
        v-for="(item, index) in products" 
        :key="item.referencia" 
        class="catalog-item"
        :class="{'page-break-after': (index + 1) % 2 === 0}"
      >
        <div class="item-img-container">
          <img 
            :src="item.urlImagen && item.urlImagen.length > 30 ? item.urlImagen : 'https://placehold.co/800x800/eeeeee/999999?text=Sin+Imagen'" 
            class="item-img" 
            alt="Producto Zabal"
          />
        </div>
        <div class="item-details">
          <div class="d-flex flex-column align-start mb-4">
            <div class="item-ref mb-1">REFERENCIA: {{ item.referencia }}</div>
            <div class="item-name">{{ item.nombre }}</div>
            <div class="item-price-pill bg-primary text-white font-weight-bold px-4 py-2 rounded-pill mt-3">
              {{ formatCurrency(item.valor_venta) }}
            </div>
          </div>
          
          <VDivider class="my-4" />
          
          <!-- Product Description Badges if exist -->
          <div v-if="item.descripcion" class="item-desc mt-auto">
            <h4 class="text-caption font-weight-bold text-uppercase mb-2 text-medium-emphasis">Características Principales</h4>
            <div class="d-flex flex-wrap gap-2">
              <span class="desc-badge">💯 {{ item.descripcion }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base screen styles (What user sees before printing) */
.catalog-print-container {
  width: 100%;
  font-family: 'Public Sans', sans-serif, -apple-system, BlinkMacSystemFont;
  color: #33303c;
  background-color: white !important;
}

/* ========================================= */
/* PREMIUM COVER PAGE STYLES                 */
/* ========================================= */
.print-header-wrapper {
  height: 100vh;
  width: 100%;
  padding: 20mm; /* Frame margin */
  background: #f8f7fa; /* Outer mat border */
  box-sizing: border-box;
}

.print-header-frame {
  height: 100%;
  width: 100%;
  background-color: white;
  border: 4px solid rgb(var(--v-theme-primary));
  outline: 1px solid rgba(var(--v-theme-primary), 0.3);
  outline-offset: 8px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
}

.header-accent-top {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 15px;
  background: linear-gradient(90deg, rgba(var(--v-theme-primary), 1) 0%, rgba(var(--v-theme-primary), 0.4) 100%);
}

.header-accent-bottom {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 100%;
  height: 15px;
  background: linear-gradient(270deg, rgba(var(--v-theme-primary), 1) 0%, rgba(var(--v-theme-primary), 0.4) 100%);
}

.letter-spacing-3 {
  letter-spacing: 3px;
}

.letter-spacing-2 {
  letter-spacing: 2px;
}

.divider-ornament {
  width: 60px;
  height: 4px;
  border-radius: 4px;
}

.z-1 {
  z-index: 1;
}

/* ========================================= */
/* GRID 2 ITEMS PER PAGE MAXIMUM SIZE        */
/* ========================================= */
.catalog-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  background: white;
}

.catalog-item {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 130mm; /* Exactly half of A4 printable height */
  border-bottom: 2px dashed #e1e0e5;
  background: white;
  box-sizing: border-box;
  padding: 10mm 0;
}

/* Clear bottom border on the last item of a page */
.page-break-after {
  border-bottom: none;
}

.item-img-container {
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 15mm;
}

.item-img {
  width: 100%;
  height: 100%;
  object-fit: contain; /* Guarantee full completeness without crop */
  border-radius: 12px;
  box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.15); /* Premium depth */
}

.item-details {
  width: 50%;
  height: 100%;
  padding-left: 10mm;
  padding-top: 5mm;
  display: flex;
  flex-direction: column;
}

.item-ref {
  font-size: 0.95rem;
  color: rgb(var(--v-theme-primary));
  font-weight: 800;
  letter-spacing: 2px;
}

.item-name {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1.1;
  color: #33303c;
  text-transform: capitalize;
}

.item-price-pill {
  font-size: 1.35rem;
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
}

.item-desc {
  font-size: 1rem;
  color: #6f6b7d;
}

.desc-badge {
  display: inline-block;
  background: #f8f7fa;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #e1e0e5;
  font-size: 0.95rem;
}

/* ========================================= */
/* STRICT PRINT MEDIA QUERIES                */
/* ========================================= */
@media print {
  @page {
    size: A4 portrait;
    margin: 15mm;
  }
  
  html, body {
    background-color: white !important;
    height: 100vh; /* Allow native break points */
  }

  /* Force background colors and remove all shadows for clean PDF vector output */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-shadow: none !important;
  }

  .catalog-print-container {
    padding: 0 !important;
    margin: 0 !important;
  }

  .print-header-wrapper {
    padding: 0;
    margin: 0;
    height: 100vh; /* Force exactly 1 cover page */
    break-after: page;
    page-break-after: always;
    background: white !important; /* Save printer墨水 */
  }

  .print-header-frame {
    border: 4pt solid rgb(var(--v-theme-primary)) !important;
    outline: 1pt solid rgba(var(--v-theme-primary), 0.5) !important;
    outline-offset: 12pt !important;
    height: calc(100vh - 30mm);
    margin: 15mm;
  }

  .catalog-grid {
    display: block;
    width: 100%;
    padding: 10mm;
  }

  .catalog-item {
    width: 100%;
    height: 130mm !important; /* 2 of these equal exactly ~1 A4 Page printable zone */
    margin-bottom: 0 !important;
    box-shadow: none !important;
    border-bottom: 2pt dashed #e1e0e5 !important;
    padding: 10mm 0 !important;
  }

  .page-break-after {
    border-bottom: none !important;
    break-after: page; /* Force next page every 2 items */
    page-break-after: always;
  }

  .item-img {
    box-shadow: none !important; /* Save ink */
    border: 1pt solid #eaeaff !important;
  }

  .item-price-pill {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Hide any loading spinners or VVuetify UI elements that might bleed into layout */
  .v-progress-circular {
    display: none !important;
  }
}
</style>
