import axios, { AxiosRequestConfig } from 'axios'
import { useAuthStore } from './store/auth'

// Create axios instance pointed at the Next.js proxy for backend API
export const api = axios.create({ baseURL: '/api' })
export const apiClient = api

// Request interceptor: attach Authorization header from Zustand on every request
api.interceptors.request.use(
  (config: any) => {
    try {
      // Read token from Zustand store synchronously
      const token = useAuthStore.getState().accessToken
      if (token) {
        config.headers = config.headers ?? {}
        ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
        // Dev-only diagnostic (masked token)
        if (process.env.NODE_ENV !== 'production') {
          try {
            // eslint-disable-next-line no-console
            console.debug('[api] Attaching Authorization header (masked):', `${String(token).slice(0,6)}...${String(token).slice(-4)}`)
          } catch {}
        }
      }
    } catch (err) {
      // If anything goes wrong reading the store, don't block the request; allow it to proceed
    }
    return config
  },
  (error) => Promise.reject(error)
)

export type ApiResponse<T> = { data: T }

export default apiClient
