import axios from 'axios'
import { useAuthStore } from './store/auth'

// Prefer hitting backend directly via env; fallback to Next.js proxy '/api'
const BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE) || '/api'

export const api = axios.create({ baseURL: BASE_URL })

// Attach Authorization header from Zustand token at request time
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers = config.headers ?? {}
      ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

export type ApiResponse<T> = { data: T }
