from sqlalchemy import create_engine, Column, String, Float, DateTime, Integer, Text, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.sql import func
from datetime import datetime
import uuid
from typing import Optional
from contextlib import contextmanager
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/finstat")

# Create engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    role = Column(String, default="user")  # user, analyst, admin
    company = Column(String)
    department = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    # Relationships
    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_hash = Column(String, unique=True)
    extracted_text = Column(Text)
    metadata = Column(JSON)
    processing_status = Column(String, default="pending")  # pending, processing, completed, failed
    processing_error = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="documents")
    analyses = relationship("AnalysisDocument", back_populates="document")

class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False, index=True)
    period = Column(String, nullable=False)
    analysis_type = Column(String, default="comprehensive")  # comprehensive, quick, custom
    
    # Financial Metrics
    eps = Column(Float)
    revenue = Column(Float)
    gross_margin = Column(Float)
    operating_margin = Column(Float)
    net_income = Column(Float)
    free_cash_flow = Column(Float)
    operating_cash_flow = Column(Float)
    total_debt = Column(Float)
    cash_equivalents = Column(Float)
    
    # Analysis Results
    summary = Column(Text)
    sentiment_score = Column(Float)
    sentiment_label = Column(String)
    sentiment_drivers = Column(JSON)
    sentiment_confidence = Column(Float)
    
    # Additional Metrics
    surprises = Column(JSON)
    consensus_data = Column(JSON)
    citations = Column(JSON)
    key_insights = Column(JSON)
    risk_factors = Column(JSON)
    growth_metrics = Column(JSON)
    
    # Metadata
    confidence_score = Column(Float)
    processing_time_ms = Column(Integer)
    model_version = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Cache control
    cache_key = Column(String, unique=True)
    cache_expires_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="analyses")
    documents = relationship("AnalysisDocument", back_populates="analysis", cascade="all, delete-orphan")
    comparisons = relationship("Comparison", foreign_keys="Comparison.analysis_id")

class AnalysisDocument(Base):
    __tablename__ = "analysis_documents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    
    # Relationships
    analysis = relationship("Analysis", back_populates="documents")
    document = relationship("Document", back_populates="analyses")

class MarketData(Base):
    __tablename__ = "market_data"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ticker = Column(String, nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Price Data
    open_price = Column(Float)
    high_price = Column(Float)
    low_price = Column(Float)
    close_price = Column(Float)
    adjusted_close = Column(Float)
    volume = Column(Integer)
    
    # Additional Metrics
    market_cap = Column(Float)
    pe_ratio = Column(Float)
    dividend_yield = Column(Float)
    beta = Column(Float)
    
    # Source
    data_source = Column(String)  # yahoo, alpha_vantage, polygon, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Comparison(Base):
    __tablename__ = "comparisons"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    comparison_analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    
    # Comparison Results
    metrics_delta = Column(JSON)
    performance_score = Column(Float)
    insights = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    key = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    scopes = Column(JSON)  # ["read", "write", "delete"]
    rate_limit = Column(Integer, default=1000)  # requests per hour
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True))
    last_used_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="api_keys")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String, nullable=False)  # login, upload, analyze, export, delete
    resource_type = Column(String)  # document, analysis, user
    resource_id = Column(String)
    ip_address = Column(String)
    user_agent = Column(String)
    metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    plan = Column(String, nullable=False)  # free, pro, enterprise
    status = Column(String, nullable=False)  # active, cancelled, expired
    
    # Limits
    documents_per_month = Column(Integer)
    analyses_per_month = Column(Integer)
    api_calls_per_month = Column(Integer)
    storage_gb = Column(Float)
    
    # Billing
    stripe_customer_id = Column(String)
    stripe_subscription_id = Column(String)
    
    # Dates
    trial_ends_at = Column(DateTime(timezone=True))
    current_period_start = Column(DateTime(timezone=True))
    current_period_end = Column(DateTime(timezone=True))
    cancelled_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Database utilities
@contextmanager
def get_db():
    """Provide a transactional scope for database operations"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)

def drop_db():
    """Drop all database tables"""
    Base.metadata.drop_all(bind=engine)