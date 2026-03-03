from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# Password hashing and verification
def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Error hashing password: {e}")
        raise

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False

# JWT token creation
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    try:
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating access token: {e}")
        raise

# Token decoding and validation
def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.error(f"Error decoding token: {e}")
        return None

def get_current_user_email(token: str) -> Optional[str]:
    """Extract user email from JWT token."""
    payload = decode_token(token)
    if payload:
        return payload.get("sub")  # 'sub' typically contains user identifier (email or user_id)
    return None

# Password strength validation
def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    
    Returns:
        tuple: (is_valid: bool, message: str)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one digit"
    
    if not any(char.isalpha() for char in password):
        return False, "Password must contain at least one letter"
    
    # Optional: Add more validations
    # if not any(char.isupper() for char in password):
    #     return False, "Password must contain at least one uppercase letter"
    
    # if not any(char.islower() for char in password):
    #     return False, "Password must contain at least one lowercase letter"
    
    # if not any(char in "!@#$%^&*()_+-=[]{}|;:,.<>?" for char in password):
    #     return False, "Password must contain at least one special character"
    
    return True, "Password is strong"

# Generate random password (optional, for admin features)
def generate_random_password(length: int = 12) -> str:
    """Generate a random password."""
    import random
    import string
    
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(random.choice(characters) for _ in range(length))
    return password

# Test password hashing and verification
def test_password_functions():
    """Test password hashing and verification functions."""
    test_password = "TestPassword123!"
    
    # Test hashing
    hashed = get_password_hash(test_password)
    print(f"Hashed password: {hashed}")
    print(f"Length: {len(hashed)}")
    
    # Test verification
    is_valid = verify_password(test_password, hashed)
    print(f"Verification result: {is_valid}")
    
    # Test wrong password
    is_wrong = verify_password("WrongPassword", hashed)
    print(f"Wrong password verification: {is_wrong}")
    
    return is_valid and not is_wrong

if __name__ == "__main__":
    # Run tests
    if test_password_functions():
        print("✓ Password functions working correctly")
    else:
        print("✗ Password functions test failed")