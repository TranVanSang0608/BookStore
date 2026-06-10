import { apiClient } from './client'

// Kiểu dữ liệu khớp với response của GET /api/health bên backend
export interface HealthResponse {
  success: boolean
  message: string
  database: 'connected' | 'disconnected'
  timestamp: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>('/health')
  return data
}
