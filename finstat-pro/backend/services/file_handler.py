import os
import shutil
import logging
import hashlib
from typing import Optional
from pathlib import Path
from datetime import datetime
import aiofiles
from fastapi import UploadFile
from core.config import settings

logger = logging.getLogger(__name__)

class FileHandler:
    """Service for handling file uploads and storage"""
    
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.max_file_size = settings.MAX_FILE_SIZE
        self.allowed_extensions = settings.ALLOWED_EXTENSIONS
    
    async def ensure_upload_directory(self) -> None:
        """Ensure upload directory exists"""
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Upload directory ready: {self.upload_dir}")
    
    async def save_upload_file(self, upload_file: UploadFile) -> Path:
        """
        Save uploaded file to disk with unique name
        """
        try:
            # Validate file extension
            file_extension = Path(upload_file.filename).suffix.lower()
            if file_extension not in self.allowed_extensions:
                raise ValueError(f"File type {file_extension} not allowed")
            
            # Generate unique filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            file_hash = hashlib.md5(upload_file.filename.encode()).hexdigest()[:8]
            safe_filename = f"{timestamp}_{file_hash}{file_extension}"
            
            # Create file path
            file_path = self.upload_dir / safe_filename
            
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await upload_file.read()
                
                # Check file size
                if len(content) > self.max_file_size:
                    raise ValueError(f"File size exceeds maximum of {self.max_file_size} bytes")
                
                await f.write(content)
            
            logger.info(f"Saved file: {file_path} ({len(content)} bytes)")
            return file_path
            
        except Exception as e:
            logger.error(f"Error saving file {upload_file.filename}: {str(e)}")
            raise
        finally:
            # Reset file position
            await upload_file.seek(0)
    
    async def delete_file(self, file_id: str) -> bool:
        """
        Delete a file by ID (filename)
        """
        try:
            file_path = self.upload_dir / file_id
            
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted file: {file_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {file_path}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting file {file_id}: {str(e)}")
            raise
    
    async def cleanup_old_files(self, days: int = 7) -> int:
        """
        Clean up files older than specified days
        """
        try:
            deleted_count = 0
            cutoff_time = datetime.utcnow().timestamp() - (days * 24 * 60 * 60)
            
            for file_path in self.upload_dir.iterdir():
                if file_path.is_file():
                    if file_path.stat().st_mtime < cutoff_time:
                        file_path.unlink()
                        deleted_count += 1
                        logger.info(f"Deleted old file: {file_path}")
            
            logger.info(f"Cleanup completed: {deleted_count} files deleted")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            raise
    
    async def get_file_info(self, file_id: str) -> Optional[dict]:
        """
        Get information about a stored file
        """
        try:
            file_path = self.upload_dir / file_id
            
            if not file_path.exists():
                return None
            
            stat = file_path.stat()
            
            return {
                "file_id": file_id,
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "path": str(file_path)
            }
            
        except Exception as e:
            logger.error(f"Error getting file info for {file_id}: {str(e)}")
            return None
    
    async def list_files(self) -> list:
        """
        List all files in upload directory
        """
        try:
            files = []
            
            for file_path in self.upload_dir.iterdir():
                if file_path.is_file():
                    stat = file_path.stat()
                    files.append({
                        "file_id": file_path.name,
                        "size": stat.st_size,
                        "created": datetime.fromtimestamp(stat.st_ctime).isoformat()
                    })
            
            return sorted(files, key=lambda x: x['created'], reverse=True)
            
        except Exception as e:
            logger.error(f"Error listing files: {str(e)}")
            return []
    
    def get_file_path(self, file_id: str) -> Optional[Path]:
        """
        Get full path for a file ID
        """
        file_path = self.upload_dir / file_id
        return file_path if file_path.exists() else None