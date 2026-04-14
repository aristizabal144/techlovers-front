import axios from 'axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
    const token = ref<string | null>(localStorage.getItem('app-token'))
    const auth = ref<any>(null)

    const setToken = (newToken: string | null) => {
        token.value = newToken
        if (newToken)
            localStorage.setItem('app-token', newToken)
        else
            localStorage.removeItem('app-token')
    }

    const setAuth = (newAuth: any) => {
        auth.value = newAuth
    }

    const login = async (loginData: any) => {
        const bodyFormData = new FormData()
        bodyFormData.append('email', loginData.email)
        bodyFormData.append('password', loginData.password)

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/login`,
                bodyFormData,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            )

            if (response.data.is_error) {
                return { success: false, message: response.data.message || 'Por favor, inténtelo nuevamente.' }
            }

            if (response.status === 200) {
                setToken(response.data.data)
                await getAuth()
                return { success: true, message: 'Ingreso exitoso.' }
            }

            return { success: false, message: 'Algo salió mal. Por favor intente de nuevo.' }
        } catch (err: any) {
            const message = err.response?.data?.message || 'Algo salió mal. Por favor intente de nuevo.'
            return { success: false, message }
        }
    }

    const getAuth = async () => {
        try {
            const currentToken = localStorage.getItem('app-token')
            if (!currentToken)
                return { success: false, message: 'No existe token para la petición' }

            const response = await axios.get(
                `${import.meta.env.VITE_API_URL}/auth`,
                {
                    params: {
                        api_token: currentToken,
                    },
                },
            )

            if (response.status === 200) {
                localStorage.setItem('app-current-role', response.data.data.rol)
                localStorage.setItem('userData', JSON.stringify(response.data.data))
                setAuth(response.data.data)
                return { success: true }
            }
            return { success: false, message: 'Algo salió mal' }
        } catch (err: any) {
            if (err.response?.status === 401) {
                setToken(null)
                localStorage.removeItem('app-current-role')
                return { success: false, isUnauthorized: true, message: 'Sesión expirada. Por favor ingrese de nuevo.' }
            }
            return { success: false, message: 'Algo salió mal al obtener el usuario' }
        }
    }

    const logout = () => {
        setToken(null)
        setAuth(null)
        localStorage.removeItem('app-current-role')
    }

    return {
        token,
        auth,
        setToken,
        setAuth,
        login,
        getAuth,
        logout,
    }
})
