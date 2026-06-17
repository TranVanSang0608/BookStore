import type { OrderStatus } from './orders'
import { apiClient } from './client'

// Số liệu tổng quan admin (Phase 9, D61) — khớp shape backend trả về ở getDashboard().
export interface DashboardData {
  kpi: {
    revenue: number // doanh thu đơn đã giao (Delivered)
    totalOrders: number
    pendingOrders: number // đơn chờ xử lý (Pending + Confirmed)
    totalUsers: number
  }
  revenueByMonth: { month: string; revenue: number }[] // 'YYYY-MM'
  topBooks: { title: string; sold: number }[]
  ordersByStatus: { status: OrderStatus; count: number }[]
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await apiClient.get<ApiResponse<DashboardData>>('/admin/dashboard')
  return data.data
}
