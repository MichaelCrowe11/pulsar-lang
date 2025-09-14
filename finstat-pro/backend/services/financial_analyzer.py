import os
import json
import logging
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
import re
import openai
from core.config import settings
from models.analysis_models import (
    AnalysisResponse, 
    FinancialMetrics,
    SentimentAnalysis,
    Citation,
    SentimentLabel,
    AnalysisOptions
)

logger = logging.getLogger(__name__)

class FinancialAnalyzer:
    """Service for AI-powered financial document analysis"""
    
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        if self.api_key:
            openai.api_key = self.api_key
        self.model = settings.AI_MODEL
        self.temperature = settings.AI_TEMPERATURE
        self.max_tokens = settings.MAX_TOKENS
    
    async def analyze_document(
        self,
        text: str,
        ticker: str,
        period: str,
        options: Optional[AnalysisOptions] = None
    ) -> AnalysisResponse:
        """
        Perform comprehensive financial document analysis
        """
        if not options:
            options = AnalysisOptions()
        
        start_time = datetime.utcnow()
        
        try:
            # Extract financial metrics
            metrics = await self._extract_financial_metrics(text, ticker, period)
            
            # Generate summary
            summary = await self._generate_summary(text, ticker, period, metrics)
            
            # Sentiment analysis
            sentiment = None
            if options.include_sentiment:
                sentiment = await self._analyze_sentiment(text)
            
            # Extract citations
            citations = self._extract_citations(text)
            
            # Calculate confidence
            confidence = self._calculate_confidence(metrics, summary, sentiment)
            
            # Calculate processing time
            processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return AnalysisResponse(
                ticker=ticker,
                period=period,
                financial_metrics=metrics,
                summary=summary,
                sentiment=sentiment or SentimentAnalysis(
                    score=0.0,
                    label=SentimentLabel.NEUTRAL,
                    drivers=[],
                    confidence=0.0
                ),
                citations=citations,
                confidence=confidence,
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            logger.error(f"Analysis error: {str(e)}")
            raise
    
    async def _extract_financial_metrics(
        self, 
        text: str, 
        ticker: str, 
        period: str
    ) -> FinancialMetrics:
        """Extract key financial metrics using AI"""
        
        # If no API key, use regex-based extraction
        if not self.api_key:
            return self._extract_metrics_regex(text)
        
        prompt = f"""
        Extract key financial metrics from this {ticker} document for period {period}.
        
        Find these specific metrics with precise numerical values:
        - Earnings Per Share (EPS) - reported and diluted
        - Revenue (total revenue/net sales)
        - Gross Margin (as percentage)
        - Operating Margin (as percentage)  
        - Net Income
        - Free Cash Flow
        - Operating Cash Flow
        - Total Debt
        - Cash and Cash Equivalents
        
        Return as JSON with keys: eps, revenue, gross_margin, operating_margin, 
        net_income, free_cash_flow, operating_cash_flow, total_debt, cash_equivalents.
        Use null for metrics not found. Convert percentages to decimals (25.5% = 25.5).
        Convert millions/billions to actual numbers (e.g., $1.2B = 1200000000).
        
        Document text (first 8000 chars):
        {text[:8000]}
        """
        
        try:
            response = await self._call_openai(prompt, response_format="json")
            metrics_dict = json.loads(response)
            return FinancialMetrics(**metrics_dict)
        except Exception as e:
            logger.warning(f"AI extraction failed, using regex: {str(e)}")
            return self._extract_metrics_regex(text)
    
    def _extract_metrics_regex(self, text: str) -> FinancialMetrics:
        """Fallback regex-based metric extraction"""
        metrics = {}
        
        # Pattern for EPS
        eps_pattern = r"(?i)earnings?\s+per\s+share.*?(\$?\s*[\d.]+)"
        eps_match = re.search(eps_pattern, text)
        metrics['eps'] = float(eps_match.group(1).replace('$', '').strip()) if eps_match else None
        
        # Pattern for Revenue
        revenue_pattern = r"(?i)(?:total\s+)?revenue.*?(\$?\s*[\d.,]+\s*[BM])"
        revenue_match = re.search(revenue_pattern, text)
        if revenue_match:
            revenue_str = revenue_match.group(1)
            metrics['revenue'] = self._parse_financial_number(revenue_str)
        
        # Pattern for margins
        margin_pattern = r"(?i)gross\s+margin.*?([\d.]+)\s*%"
        margin_match = re.search(margin_pattern, text)
        metrics['gross_margin'] = float(margin_match.group(1)) if margin_match else None
        
        # Add more patterns as needed...
        
        return FinancialMetrics(**metrics)
    
    def _parse_financial_number(self, value_str: str) -> float:
        """Parse financial numbers with B/M suffixes"""
        value_str = value_str.replace('$', '').replace(',', '').strip()
        
        if 'B' in value_str.upper():
            return float(value_str.upper().replace('B', '')) * 1e9
        elif 'M' in value_str.upper():
            return float(value_str.upper().replace('M', '')) * 1e6
        else:
            return float(value_str)
    
    async def _generate_summary(
        self,
        text: str,
        ticker: str,
        period: str,
        metrics: FinancialMetrics
    ) -> str:
        """Generate AI-powered earnings summary"""
        
        if not self.api_key:
            return self._generate_basic_summary(ticker, period, metrics)
        
        metrics_text = json.dumps(metrics.dict(), indent=2)
        
        prompt = f"""
        Generate a concise earnings summary for {ticker} for period {period}.
        
        Base your analysis on these extracted metrics:
        {metrics_text}
        
        Include:
        1. Key financial performance highlights
        2. Notable changes vs prior periods (if mentioned)
        3. Management commentary highlights
        4. Overall assessment
        
        Keep factual and professional. Maximum 300 words.
        
        Document excerpt:
        {text[:10000]}
        """
        
        try:
            response = await self._call_openai(prompt)
            return response
        except Exception as e:
            logger.warning(f"AI summary failed: {str(e)}")
            return self._generate_basic_summary(ticker, period, metrics)
    
    def _generate_basic_summary(
        self, 
        ticker: str, 
        period: str, 
        metrics: FinancialMetrics
    ) -> str:
        """Generate basic summary without AI"""
        summary_parts = [
            f"Financial analysis for {ticker} - {period}:"
        ]
        
        if metrics.eps:
            summary_parts.append(f"Earnings per share: ${metrics.eps:.2f}")
        if metrics.revenue:
            summary_parts.append(f"Revenue: ${metrics.revenue/1e9:.2f}B")
        if metrics.gross_margin:
            summary_parts.append(f"Gross margin: {metrics.gross_margin:.1f}%")
        if metrics.net_income:
            summary_parts.append(f"Net income: ${metrics.net_income/1e9:.2f}B")
        
        if len(summary_parts) == 1:
            summary_parts.append("Limited financial metrics could be extracted from the document.")
        
        return " ".join(summary_parts)
    
    async def _analyze_sentiment(self, text: str) -> SentimentAnalysis:
        """Analyze sentiment of financial document"""
        
        if not self.api_key:
            return self._analyze_sentiment_basic(text)
        
        prompt = f"""
        Analyze the sentiment of this financial document.
        
        Provide:
        1. Overall sentiment score (-1 to +1)
        2. Sentiment label (Positive, Neutral, or Negative)
        3. Key sentiment drivers (3-5 specific phrases)
        4. Confidence (0 to 1)
        
        Return as JSON with keys: score, label, drivers, confidence
        
        Document excerpt:
        {text[:5000]}
        """
        
        try:
            response = await self._call_openai(prompt, response_format="json")
            sentiment_dict = json.loads(response)
            
            # Ensure correct label enum
            label = sentiment_dict.get('label', 'Neutral')
            if label not in ['Positive', 'Negative', 'Neutral']:
                label = 'Neutral'
            
            return SentimentAnalysis(
                score=max(-1, min(1, float(sentiment_dict.get('score', 0)))),
                label=SentimentLabel(label),
                drivers=sentiment_dict.get('drivers', [])[:5],
                confidence=max(0, min(1, float(sentiment_dict.get('confidence', 0.5))))
            )
        except Exception as e:
            logger.warning(f"AI sentiment analysis failed: {str(e)}")
            return self._analyze_sentiment_basic(text)
    
    def _analyze_sentiment_basic(self, text: str) -> SentimentAnalysis:
        """Basic sentiment analysis without AI"""
        positive_words = ['growth', 'increase', 'improve', 'strong', 'exceed', 'record', 'gain']
        negative_words = ['decline', 'decrease', 'loss', 'weak', 'below', 'challenge', 'difficult']
        
        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        total = positive_count + negative_count
        if total == 0:
            score = 0.0
            label = SentimentLabel.NEUTRAL
        else:
            score = (positive_count - negative_count) / total
            if score > 0.1:
                label = SentimentLabel.POSITIVE
            elif score < -0.1:
                label = SentimentLabel.NEGATIVE
            else:
                label = SentimentLabel.NEUTRAL
        
        return SentimentAnalysis(
            score=score,
            label=label,
            drivers=['Based on keyword analysis'],
            confidence=0.5
        )
    
    def _extract_citations(self, text: str) -> List[Citation]:
        """Extract key citations from document"""
        citations = []
        
        # Look for page markers
        page_matches = re.findall(r'--- Page (\d+) ---', text)
        
        # Key sections to cite
        sections = [
            'Management Discussion',
            'Financial Highlights',
            'Consolidated Statements',
            'Risk Factors'
        ]
        
        for section in sections:
            if section.lower() in text.lower():
                citations.append(Citation(
                    section=section,
                    text=f"Referenced in document analysis",
                    page='Multiple' if len(page_matches) > 1 else '1'
                ))
        
        if not citations:
            citations.append(Citation(
                section='Full Document',
                text='Complete document analyzed',
                page=f"1-{len(page_matches)}" if page_matches else "1"
            ))
        
        return citations[:10]  # Limit citations
    
    def _calculate_confidence(
        self,
        metrics: FinancialMetrics,
        summary: str,
        sentiment: Optional[SentimentAnalysis]
    ) -> float:
        """Calculate overall analysis confidence"""
        confidence_factors = []
        
        # Metrics confidence
        metrics_dict = metrics.dict()
        non_null_metrics = sum(1 for v in metrics_dict.values() if v is not None)
        total_metrics = len(metrics_dict)
        if total_metrics > 0:
            metrics_confidence = non_null_metrics / total_metrics
            confidence_factors.append(metrics_confidence * 0.4)
        
        # Summary confidence
        if summary and len(summary) > 100:
            summary_confidence = min(1.0, len(summary) / 500)
            confidence_factors.append(summary_confidence * 0.3)
        
        # Sentiment confidence
        if sentiment:
            confidence_factors.append(sentiment.confidence * 0.3)
        
        return sum(confidence_factors) if confidence_factors else 0.5
    
    async def _call_openai(
        self, 
        prompt: str, 
        response_format: Optional[str] = None
    ) -> str:
        """Call OpenAI API with retry logic"""
        
        for attempt in range(3):
            try:
                messages = [
                    {"role": "system", "content": "You are a financial analyst expert."},
                    {"role": "user", "content": prompt}
                ]
                
                kwargs = {
                    "model": self.model,
                    "messages": messages,
                    "temperature": self.temperature,
                    "max_tokens": self.max_tokens
                }
                
                if response_format == "json":
                    kwargs["response_format"] = {"type": "json_object"}
                
                response = await asyncio.to_thread(
                    openai.ChatCompletion.create,
                    **kwargs
                )
                
                return response.choices[0].message.content.strip()
                
            except Exception as e:
                logger.warning(f"OpenAI API attempt {attempt + 1} failed: {str(e)}")
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)  # Exponential backoff