import { ofetch } from 'ofetch'

export const $api = ofetch.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  async onRequest({ options }) {
    const accessToken = useCookie('accessToken').value || localStorage.getItem('app-token')
    if (accessToken) {
      options.query = { ...options.query, api_token: accessToken }
    }
  },
  async onResponseError({ response }) {
    if (response.status === 401) {
      // Borramos las cookies y el local storage
      useCookie('userData').value = null
      useCookie('accessToken').value = null
      localStorage.removeItem('userData')
      localStorage.removeItem('app-token')

      // Redirigimos al componente de login y pasamos el alert temporal
      window.location.replace('/login?sessionExpired=true')
    }
  },
})
