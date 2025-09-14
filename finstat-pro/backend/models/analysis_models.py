from typing import List, Optional, Dict, Any
from pydantic import BaseModel, validator
from datetime import datetime
from enum import Enum

class SentimentLabel(str, Enum):
    POSITIVE = "Positive"
    NEGATIVE = "Negative"
    NEUTRAL = "Neutral"

class AnalysisOptions(BaseModel):
    include_sentiment: bool = True
    include_surprise: bool = True
    confidence_threshold: float = 0.7
    max_summary_length: int = 500

class AnalysisRequest(BaseModel):
    ticker: str
    period: str
    file_paths: List[str]
    options: Optional[AnalysisOptions] = AnalysisOptions()
    
    @validator('ticker')
    def ticker_must_be_uppercase(cls, v):
        return v.upper().strip()
    
    @validator('file_paths')
    def file_paths_not_empty(cls, v):
        if not v:
            raise ValueError('At least one file path must be provided')
        return v

class FinancialMetrics(BaseModel):
    eps: Optional[float] = None
    revenue: Optional[float] = None
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    net_income: Optional[float] = None
    free_cash_flow: Optional[float] = None
    operating_cash_flow: Optional[float] = None
    total_debt: Optional[float] = None
    cash_equivalents: Optional[float] = None

class SentimentAnalysis(BaseModel):
    score: float  # -1 to 1
    label: SentimentLabel
    drivers: List[str] = []
    confidence: float  # 0 to 1
    
    @validator('score')
    def score_range(cls, v):
        if not -1 <= v <= 1:
            raise ValueError('Score must be between -1 and 1')
        return v
    
    @validator('confidence')
    def confidence_range(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Confidence must be between 0 and 1')
        return v

class Citation(BaseModel):
    section: str
    text: str
    page: str

class Surprises(BaseModel):
    eps_surprise_pct: Optional[float] = None
    revenue_surprise_pct: Optional[float] = None
    net_income_surprise_pct: Optional[float] = None

class ConsensusData(BaseModel):
    eps_estimate: Optional[float] = None
    revenue_estimate: Optional[float] = None
    net_income_estimate: Optional[float] = None
    period: str

class AnalysisResponse(BaseModel):
    ticker: str
    period: str
    financial_metrics: FinancialMetrics
    summary: str
    sentiment: SentimentAnalysis
    citations: List[Citation] = []
    surprises: Optional[Surprises] = None
    consensus: Optional[ConsensusData] = None
    confidence: float  # 0 to 1
    analysis_timestamp: datetime = datetime.utcnow()
    processing_time_ms: Optional[int] = None
    
    @validator('confidence')
    def confidence_range(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Confidence must be between 0 and 1')
        return v

class FileInfo(BaseModel):
    filename: str
    size: int
    type: str
    path: str
    text_length: int
    processed_at: datetime

class UploadResponse(BaseModel):
    message: str
    files: List[FileInfo]
    total_files: int

class ErrorResponse(BaseModel):
    error: str
    detail: str
    timestamp: datetime = datetime.utcnow()
    
class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"
    uptime_seconds: Optional[int] = None