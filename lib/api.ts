// Minimal API client used across the app.
// Provides typed get/post/put/delete helpers that return { data } to match previous usage.
const BASE = (typeof window !== 'undefined' && (window as any).__NEXT_PUBLIC_API_BASE) || 'http://localhost:3000/api'

type ApiResponse<T = any> = { data: T }

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<ApiResponse<T>> {
	const url = /^https?:\/\//i.test(path) ? path : `${BASE}${path.startsWith('/') ? path : `/${path}`}`
	const res = await fetch(url, { credentials: 'include', ...opts })
	const text = await res.text()
	let data: any = null
	try { data = text ? JSON.parse(text) : null } catch { data = text }
	if (!res.ok) {
		const err: any = new Error(data?.message || `API request failed: ${res.status}`)
		err.status = res.status
		err.data = data
		throw err
	}
	return { data }
}

export const apiClient = {
	get: <T = any>(p: string) => request<T>(p, { method: 'GET' }),
	post: <T = any>(p: string, body?: any, opts: RequestInit = {}) => request<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, ...opts }),
	put: <T = any>(p: string, body?: any, opts: RequestInit = {}) => request<T>(p, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, ...opts }),
	delete: <T = any>(p: string, opts: RequestInit = {}) => request<T>(p, { method: 'DELETE', ...opts }),
}

export const api = apiClient
export default apiClient
