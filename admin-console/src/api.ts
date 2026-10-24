import { keycloak } from './auth'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8070'

export class ApiError extends Error {}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  await keycloak.updateToken(30)
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${keycloak.token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try {
      const j = JSON.parse(text)
      msg = j.errorMessage ?? j.error_description ?? j.message ?? text
    } catch { /* plain text */ }
    throw new ApiError(`${res.status} ${msg || res.statusText}`)
  }
  return res.status === 204 || res.headers.get('content-length') === '0'
    ? (undefined as T)
    : ((await res.json()) as T)
}

export const api = {
  get: <T,>(p: string) => request<T>('GET', p),
  post: <T,>(p: string, b: unknown) => request<T>('POST', p, b),
  put: <T,>(p: string, b: unknown) => request<T>('PUT', p, b),
  del: <T,>(p: string) => request<T>('DELETE', p),
}

export interface Scope { name: string }
export interface Resource { _id: string; name: string; type?: string; uris: string[]; scopes: Scope[] }
export interface Role { id: string; name: string; description?: string }
export interface Policy {
  id: string; name: string; type: string; logic: string; decisionStrategy: string
  roles?: { id: string; required: boolean }[]
  targetClaim?: string; pattern?: string
  hour?: string; hourEnd?: string
}
export interface Named { id: string; name: string }
export interface Permission {
  id: string; name: string; decisionStrategy: string
  resources: Named[]; policies: Named[]; scopes: Named[]
}
export interface User { id: string; username: string; email?: string }
export interface EvalResult {
  matchedResources: Resource[]
  note?: string
  results?: {
    resource: { name: string }
    status: 'PERMIT' | 'DENY'
    policies: { policy: { name: string; type: string }; status: string }[]
  }[]
}
