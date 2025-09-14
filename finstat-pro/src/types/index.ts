export interface FinancialMetrics {
  eps?: number | null;
  revenue?: number | null;
  gross_margin?: number | null;
  operating_margin?: number | null;
  net_income?: number | null;
  free_cash_flow?: number | null;
  operating_cash_flow?: number | null;
  total_debt?: number | null;
  cash_equivalents?: number | null;
}

export interface SentimentAnalysis {
  score: number;
  label: 'Positive' | 'Negative' | 'Neutral';
  drivers: string[];
  confidence: number;
}

export interface Citation {
  section: string;
  text: string;
  page: string;
}

export interface Surprises {
  [key: string]: number;
}

export interface ConsensusData {
  eps_estimate?: number;
  revenue_estimate?: number;
  net_income_estimate?: number;
  period: string;
}

export interface AnalysisResult {
  ticker: string;
  period: string;
  financial_metrics: FinancialMetrics;
  summary: string;
  sentiment: SentimentAnalysis;
  citations: Citation[];
  surprises?: Surprises;
  consensus?: ConsensusData;
  confidence: number;
  analysis_timestamp: string;
}

export interface DocumentInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface UploadProgress {
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error';
  message: string;
}

export interface DashboardStats {
  totalDocuments: number;
  avgConfidence: number;
  lastAnalysis: string;
  topTickers: string[];
}