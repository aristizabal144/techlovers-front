import { createApp } from 'vue'

import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'

// Styles
import '@core/scss/template/index.scss'
import '@styles/styles.scss'

// Create vue app
const app = createApp(App)

// Register plugins
registerPlugins(app)

// Register Global Axios Interceptors
import setupAxiosInterceptors from '@/plugins/axios'
setupAxiosInterceptors()

// Mount vue app
app.mount('#app')
