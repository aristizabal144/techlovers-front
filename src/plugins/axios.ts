import axios from 'axios'
import { router } from '@/plugins/1.router'

export default function setupAxiosInterceptors() {
    axios.interceptors.response.use(
        (response) => {
            // If the backend returns a custom 200 with an error flag
            if (response.data && response.data.error === 'Unauthenticated.') {
                handleUnauthorized()
            }
            return response
        },
        (error) => {
            // If the backend returns an actual 401 HTTP status
            if (error.response && error.response.status === 401) {
                handleUnauthorized()
            }
            return Promise.reject(error)
        }
    )
}

function handleUnauthorized() {
    // Clear Auth Tokens
    localStorage.removeItem('app-token')
    localStorage.removeItem('userData')

    // Redirect via the active global router instance
    if (router) {
        router.push('/login').then(() => {
            // We attach a query param so the login page can show the error gracefully on mount
            router.replace({ path: '/login', query: { sessionExpired: 'true' } })
        })
    } else {
        window.location.href = '/login?sessionExpired=true'
    }
}

