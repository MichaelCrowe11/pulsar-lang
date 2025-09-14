import { create } from 'zustand'
import { AnalysisResult, DocumentInfo, UploadProgress, DashboardStats } from '@/types'

interface AppState {
  // Analysis state
  currentAnalysis: AnalysisResult | null;
  analysisHistory: AnalysisResult[];
  
  // Upload state
  uploadedFiles: DocumentInfo[];
  uploadProgress: UploadProgress;
  
  // Dashboard state
  dashboardStats: DashboardStats;
  
  // UI state
  sidebarOpen: boolean;
  currentPage: string;
  theme: 'light' | 'dark';
  
  // Actions
  setCurrentAnalysis: (analysis: AnalysisResult | null) => void;
  addAnalysisToHistory: (analysis: AnalysisResult) => void;
  setUploadedFiles: (files: DocumentInfo[]) => void;
  setUploadProgress: (progress: UploadProgress) => void;
  updateDashboardStats: (stats: Partial<DashboardStats>) => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: string) => void;
  toggleTheme: () => void;
  clearAnalysis: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentAnalysis: null,
  analysisHistory: [],
  uploadedFiles: [],
  uploadProgress: {
    progress: 0,
    status: 'idle',
    message: 'Ready to upload'
  },
  dashboardStats: {
    totalDocuments: 0,
    avgConfidence: 0,
    lastAnalysis: '',
    topTickers: []
  },
  sidebarOpen: true,
  currentPage: 'dashboard',
  theme: 'light',
  
  // Actions
  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  
  addAnalysisToHistory: (analysis) => set((state) => ({
    analysisHistory: [analysis, ...state.analysisHistory.slice(0, 49)] // Keep last 50
  })),
  
  setUploadedFiles: (files) => set({ uploadedFiles: files }),
  
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  
  updateDashboardStats: (stats) => set((state) => ({
    dashboardStats: { ...state.dashboardStats, ...stats }
  })),
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  setCurrentPage: (page) => set({ currentPage: page }),
  
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),
  
  clearAnalysis: () => set({
    currentAnalysis: null,
    uploadedFiles: [],
    uploadProgress: {
      progress: 0,
      status: 'idle',
      message: 'Ready to upload'
    }
  })
}))