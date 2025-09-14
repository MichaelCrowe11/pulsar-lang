import axios, { AxiosInstance, AxiosError } from 'axios'
import { AnalysisResult, DocumentInfo } from '@/types'
import toast from 'react-hot-toast'

class ApiService {
  private client: AxiosInstance
  
  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      timeout: 60000, // 60 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const message = (error.response.data as any)?.detail || 'An error occurred'
          toast.error(message)
        } else if (error.request) {
          toast.error('No response from server. Please check your connection.')
        } else {
          toast.error('Request failed. Please try again.')
        }
        return Promise.reject(error)
      }
    )
  }
  
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health')
      return response.data.status === 'healthy'
    } catch {
      return false
    }
  }
  
  // Upload documents
  async uploadDocuments(files: File[]): Promise<{
    message: string
    files: Array<{
      filename: string
      size: number
      type: string
      path: string
      text_length: number
      processed_at: string
    }>
    total_files: number
  }> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    
    const response = await this.client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          // You can emit this progress to a state manager or callback
          console.log(`Upload Progress: ${percentCompleted}%`)
        }
      },
    })
    
    return response.data
  }
  
  // Analyze documents
  async analyzeDocuments(
    ticker: string,
    period: string,
    filePaths: string[],
    options?: {
      include_sentiment?: boolean
      include_surprise?: boolean
      confidence_threshold?: number
    }
  ): Promise<AnalysisResult> {
    const response = await this.client.post('/analyze', {
      ticker,
      period,
      file_paths: filePaths,
      options: options || {
        include_sentiment: true,
        include_surprise: true,
        confidence_threshold: 0.7,
      },
    })
    
    return response.data
  }
  
  // Get supported formats
  async getSupportedFormats(): Promise<{
    formats: Array<{
      extension: string
      description: string
      max_size: string
    }>
    max_files: number
    total_max_size: string
  }> {
    const response = await this.client.get('/supported-formats')
    return response.data
  }
  
  // Get analysis history
  async getAnalysisHistory(limit: number = 50): Promise<{
    analyses: AnalysisResult[]
    total: number
    limit: number
  }> {
    const response = await this.client.get('/analysis/history', {
      params: { limit }
    })
    return response.data
  }
  
  // Delete file
  async deleteFile(fileId: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/files/${fileId}`)
    return response.data
  }
}

// Export singleton instance
export const api = new ApiService()

// Export hooks for React components
export function useApi() {
  return api
}