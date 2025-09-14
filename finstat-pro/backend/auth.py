from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from sqlalchemy.orm import Session
import secrets
import hashlib
from database import get_db, User, APIKey, AuditLog
from core.config import settings
import re
from enum import Enum

# Security configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
security = HTTPBearer()

class UserRole(str, Enum):
    USER = "user"
    ANALYST = "analyst"
    ADMIN = "admin"
    ENTERPRISE = "enterprise"

class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    API_KEY = "api_key"

class AuthService:
    """Enhanced authentication and authorization service"""
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        self.refresh_token_expire = timedelta(days=7)
        
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash password using bcrypt"""
        return pwd_context.hash(password)
    
    def validate_password_strength(self, password: str) -> tuple[bool, str]:
        """Validate password meets security requirements"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        if not re.search(r"[A-Z]", password):
            return False, "Password must contain at least one uppercase letter"
        if not re.search(r"[a-z]", password):
            return False, "Password must contain at least one lowercase letter"
        if not re.search(r"\d", password):
            return False, "Password must contain at least one digit"
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            return False, "Password must contain at least one special character"
        return True, "Password is strong"
    
    def create_token(
        self, 
        data: Dict[str, Any], 
        token_type: TokenType = TokenType.ACCESS,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT token with claims"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        elif token_type == TokenType.ACCESS:
            expire = datetime.utcnow() + self.access_token_expire
        elif token_type == TokenType.REFRESH:
            expire = datetime.utcnow() + self.refresh_token_expire
        else:
            expire = datetime.utcnow() + timedelta(days=365)  # API keys
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": token_type.value,
            "jti": secrets.token_urlsafe(16)  # JWT ID for revocation
        })
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str, token_type: TokenType = TokenType.ACCESS) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            if payload.get("type") != token_type.value:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            return payload
            
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )
    
    def create_access_token(self, user: User) -> str:
        """Create access token for user"""
        return self.create_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "is_verified": user.is_verified
        }, TokenType.ACCESS)
    
    def create_refresh_token(self, user: User) -> str:
        """Create refresh token for user"""
        return self.create_token({
            "sub": user.id,
            "email": user.email
        }, TokenType.REFRESH)
    
    def generate_api_key(self) -> str:
        """Generate secure API key"""
        return f"fsp_{secrets.token_urlsafe(32)}"
    
    def hash_api_key(self, api_key: str) -> str:
        """Hash API key for storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()

# Dependency injection functions
auth_service = AuthService()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    payload = auth_service.verify_token(token, TokenType.ACCESS)
    
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return user

async def get_current_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user is verified"""
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required"
        )
    return current_user

async def get_current_analyst(
    current_user: User = Depends(get_current_verified_user)
) -> User:
    """Ensure user has analyst role or higher"""
    if current_user.role not in [UserRole.ANALYST, UserRole.ADMIN, UserRole.ENTERPRISE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analyst privileges required"
        )
    return current_user

async def get_current_admin(
    current_user: User = Depends(get_current_verified_user)
) -> User:
    """Ensure user has admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

async def verify_api_key(
    api_key: str,
    db: Session = Depends(get_db)
) -> APIKey:
    """Verify API key and return associated key object"""
    hashed_key = auth_service.hash_api_key(api_key)
    
    key_obj = db.query(APIKey).filter(
        APIKey.key == hashed_key,
        APIKey.is_active == True
    ).first()
    
    if not key_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    # Check expiration
    if key_obj.expires_at and key_obj.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key expired"
        )
    
    # Update last used
    key_obj.last_used_at = datetime.utcnow()
    db.commit()
    
    return key_obj

class RateLimiter:
    """Rate limiting for API endpoints"""
    
    def __init__(self, requests_per_hour: int = 1000):
        self.requests_per_hour = requests_per_hour
        self.requests = {}
    
    async def check_rate_limit(self, user_id: str) -> bool:
        """Check if user has exceeded rate limit"""
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)
        
        # Clean old requests
        if user_id in self.requests:
            self.requests[user_id] = [
                req_time for req_time in self.requests[user_id]
                if req_time > hour_ago
            ]
        else:
            self.requests[user_id] = []
        
        # Check limit
        if len(self.requests[user_id]) >= self.requests_per_hour:
            return False
        
        # Add current request
        self.requests[user_id].append(now)
        return True

# Global rate limiter instance
rate_limiter = RateLimiter()

async def check_rate_limit(current_user: User = Depends(get_current_user)):
    """Rate limiting dependency"""
    if not await rate_limiter.check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    return current_user

def log_audit_event(
    db: Session,
    user_id: str,
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    metadata: Optional[Dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """Log audit event for compliance and security"""
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata=metadata,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()