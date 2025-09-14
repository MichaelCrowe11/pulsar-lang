import os
import logging
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from pydantic import BaseModel
from datetime import datetime
import asyncio
import json

from services.document_processor import DocumentProcessor
from services.financial_analyzer import FinancialAnalyzer
from services.file_handler import FileHandler
from models.analysis_models import AnalysisRequest, AnalysisResponse
from core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="FinStat Pro API",
    description="Advanced AI-powered financial document analysis backend",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
document_processor = DocumentProcessor()
financial_analyzer = FinancialAnalyzer()
file_handler = FileHandler()

@app.on_startup
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting FinStat Pro API...")
    await file_handler.ensure_upload_directory()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.post("/upload", response_model=dict)
async def upload_documents(files: List[UploadFile] = File(...)):
    """
    Upload and process multiple financial documents
    """
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        # Validate file types
        allowed_extensions = {'.pdf', '.txt', '.doc', '.docx', '.csv'}
        for file in files:
            if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unsupported file type: {file.filename}. Allowed: {', '.join(allowed_extensions)}"
                )
        
        # Process files
        processed_files = []
        for file in files:
            try:
                # Save file
                file_path = await file_handler.save_upload_file(file)
                
                # Extract text
                extracted_text = await document_processor.extract_text_from_file(file_path)
                
                # Store file info
                file_info = {
                    "filename": file.filename,
                    "size": file.size,
                    "type": file.content_type,
                    "path": str(file_path),
                    "text_length": len(extracted_text),
                    "processed_at": datetime.utcnow().isoformat()
                }
                processed_files.append(file_info)
                
                logger.info(f"Processed file: {file.filename} ({len(extracted_text)} characters)")
                
            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error processing {file.filename}: {str(e)}")
        
        return {
            "message": f"Successfully processed {len(processed_files)} files",
            "files": processed_files,
            "total_files": len(processed_files)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_documents(request: AnalysisRequest):
    """
    Analyze uploaded documents and extract financial insights
    """
    try:
        logger.info(f"Starting analysis for {request.ticker} {request.period}")
        
        # Combine all document text
        combined_text = ""
        total_chars = 0
        
        for file_path in request.file_paths:
            if not os.path.exists(file_path):
                logger.warning(f"File not found: {file_path}")
                continue
                
            text = await document_processor.extract_text_from_file(file_path)
            combined_text += f"\n\n--- Document: {os.path.basename(file_path)} ---\n\n{text}"
            total_chars += len(text)
        
        if not combined_text.strip():
            raise HTTPException(status_code=400, detail="No text content found in documents")
        
        logger.info(f"Analyzing {total_chars} characters of text")
        
        # Run financial analysis
        analysis_result = await financial_analyzer.analyze_document(
            text=combined_text,
            ticker=request.ticker,
            period=request.period,
            options=request.options
        )
        
        logger.info(f"Analysis completed for {request.ticker} with confidence {analysis_result.confidence:.2f}")
        
        return analysis_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats"""
    return {
        "formats": [
            {"extension": ".pdf", "description": "PDF documents", "max_size": "50MB"},
            {"extension": ".txt", "description": "Plain text files", "max_size": "10MB"},
            {"extension": ".doc", "description": "Microsoft Word documents", "max_size": "25MB"},
            {"extension": ".docx", "description": "Microsoft Word documents (newer)", "max_size": "25MB"},
            {"extension": ".csv", "description": "Comma-separated values", "max_size": "5MB"}
        ],
        "max_files": 10,
        "total_max_size": "100MB"
    }

@app.get("/analysis/history")
async def get_analysis_history(limit: int = 50):
    """Get recent analysis history"""
    # This would typically come from a database
    # For now, return empty list
    return {
        "analyses": [],
        "total": 0,
        "limit": limit
    }

@app.delete("/files/{file_id}")
async def delete_file(file_id: str):
    """Delete an uploaded file"""
    try:
        success = await file_handler.delete_file(file_id)
        if success:
            return {"message": f"File {file_id} deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        logger.error(f"Error deleting file {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete file")

if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )