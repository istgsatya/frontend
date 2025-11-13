// Centralized API client (axios-based) with default Content-Type header and
// Authorization interceptor. This replaces the prior fetch-based helper and
// ensures POST/PUT requests are sent with application/json by default while
// still allowing FormData to be sent unmodified.
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

// Resolve base API URL in order of precedence:
// 1) window.__NEXT_PUBLIC_API_BASE (in case something injects it at runtime),
// 2) process.env.NEXT_PUBLIC_API_BASE (set via next.config or .env.local),
// 3) fallback to relative '/api' so the browser uses the current origin and Next rewrites.
const BASE = (typeof window !== 'undefined' && (window as any).__NEXT_PUBLIC_API_BASE) || process.env.NEXT_PUBLIC_API_BASE || '/api'

function getStoredToken(): string | null {
	if (typeof window === 'undefined') return null
	try {
		const raw = window.localStorage.getItem('tc-auth')
		if (!raw) return null
		const parsed = JSON.parse(raw)
		// Zustand persist may wrap state under `state`
		return parsed?.state?.accessToken ?? parsed?.accessToken ?? null
	} catch {
		return null
	}
}

// Create the base Axios client.
const axiosClient: AxiosInstance = axios.create({
	baseURL: BASE,
	// --- THIS IS THE FIX. Ensure default Content-Type is application/json ---
	headers: {
		'Content-Type': 'application/json',
	},
})

// Interceptor: attach Authorization header if we have a stored token.
axiosClient.interceptors.request.use(
	(config: any) => {
		// Defensive guard: refuse to send requests that contain 'undefined' or 'null'
		// in the URL path. This prevents accidental backend errors like
		// GET /withdrawals/undefined/votecount when a caller passes an
		// undefined id into a template string.
		try {
			const rawUrl = String(config?.url ?? '')
			// Normalize and test for the literal words undefined/null in the path
			if (/\bundefined\b/.test(rawUrl) || /\bnull\b/.test(rawUrl)) {
				console.warn('Blocked API request with invalid URL:', rawUrl)
				return Promise.reject(new Error(`Blocked API request: invalid URL contains undefined/null: ${rawUrl}`))
			}
		} catch (err) {
			// If our guard fails for any reason, don't block normal behavior —
			// fall through and continue; the auth interceptor below will still run.
		}
		try {
			const token = getStoredToken()
			if (token) {
				config.headers = config.headers || {}
				;(config.headers as any).Authorization = `Bearer ${token}`
			}
		} catch {}
		return config
	},
	(error) => Promise.reject(error)
)

// Export a small wrapper that mirrors the previous apiClient shape (returns { data })
export const apiClient = {
	get: <T = any>(p: string) => axiosClient.get<T>(p).then(r => ({ data: r.data })),
	post: <T = any>(p: string, body?: any, opts: AxiosRequestConfig = {}) => {
		// If body is FormData, let the browser set the Content-Type (including boundary).
		if (body instanceof FormData) {
			// Ensure we don't send the default application/json header for this request
			// Explicitly set Content-Type to undefined so axios will not include the instance default
			const headers = { ...(opts.headers || {}), 'Content-Type': undefined }
			return axiosClient.post<T>(p, body, { ...opts, headers }).then(r => ({ data: r.data }))
		}
		return axiosClient.post<T>(p, body, opts).then(r => ({ data: r.data }))
	},
	put: <T = any>(p: string, body?: any, opts: AxiosRequestConfig = {}) => {
		if (body instanceof FormData) {
			const headers = { ...(opts.headers || {}), 'Content-Type': undefined }
			return axiosClient.put<T>(p, body, { ...opts, headers }).then(r => ({ data: r.data }))
		}
		return axiosClient.put<T>(p, body, opts).then(r => ({ data: r.data }))
	},
	delete: <T = any>(p: string, opts: AxiosRequestConfig = {}) => axiosClient.delete<T>(p, opts).then(r => ({ data: r.data })),
}

export const api = apiClient
export default apiClient
