const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

interface RequestOptions extends RequestInit {
  token?: string
}

class ApiClient {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', token)
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('admin_token')
    }
    return this.token
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    const authToken = token || this.getToken()
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    this.setToken(response.token)
    return response
  }

  async logout() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token')
    }
  }

  // Stats endpoints
  async getStats() {
    return this.request('/admin/stats')
  }

  async getRevenue(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.request(`/admin/revenue?period=${period}`)
  }

  // License endpoints
  async getLicenses(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams(params as any).toString()
    return this.request(`/admin/licenses?${query}`)
  }

  async getLicense(id: string) {
    return this.request(`/admin/licenses/${id}`)
  }

  async createLicense(data: any) {
    return this.request('/admin/licenses', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateLicense(id: string, data: any) {
    return this.request(`/admin/licenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async suspendLicense(id: string) {
    return this.request(`/admin/licenses/${id}/suspend`, {
      method: 'POST'
    })
  }

  async revokeLicense(id: string) {
    return this.request(`/admin/licenses/${id}/revoke`, {
      method: 'POST'
    })
  }

  async reactivateLicense(id: string) {
    return this.request(`/admin/licenses/${id}/reactivate`, {
      method: 'POST'
    })
  }

  // Customer endpoints
  async getCustomers(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString()
    return this.request(`/admin/customers?${query}`)
  }

  async getCustomer(id: string) {
    return this.request(`/admin/customers/${id}`)
  }

  // Payment endpoints
  async getPayments(params?: { page?: number; limit?: number; method?: string }) {
    const query = new URLSearchParams(params as any).toString()
    return this.request(`/admin/payments?${query}`)
  }

  async refundPayment(id: string, amount?: number) {
    return this.request(`/admin/payments/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    })
  }

  // Activity endpoints
  async getActivity(limit: number = 50) {
    return this.request(`/admin/activity?limit=${limit}`)
  }

  // System endpoints
  async getSystemHealth() {
    return this.request('/admin/system/health')
  }

  async getSystemMetrics() {
    return this.request('/admin/system/metrics')
  }
}

export const apiClient = new ApiClient()
export default apiClient