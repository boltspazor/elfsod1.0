import re
from typing import Optional, Tuple
from urllib.parse import urlparse

def validate_email(email: str) -> bool:
    """
    Validate email format.
    
    Args:
        email: Email address to validate
        
    Returns:
        bool: True if email is valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
    
    # Basic email pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    # Check pattern match
    if not re.match(pattern, email):
        return False
    
    # Additional checks
    if '..' in email:
        return False
    
    # Check length constraints
    local_part, domain_part = email.split('@')
    if len(local_part) > 64 or len(domain_part) > 255:
        return False
    
    return True

def validate_phone(phone: str, country_code: str = "IN") -> Tuple[bool, str]:
    """
    Validate phone number based on country.
    
    Args:
        phone: Phone number to validate
        country_code: ISO country code (default: "IN" for India)
        
    Returns:
        tuple: (is_valid: bool, formatted_number: str)
    """
    if not phone:
        return False, ""
    
    # Remove all non-digit characters
    cleaned = re.sub(r'[^\d\+]', '', phone)
    
    if not cleaned:
        return False, ""
    
    # Country-specific validation
    if country_code == "IN":  # India
        # Indian numbers: +91 or 0 followed by 10 digits
        pattern = r'^(\+91|0)?[6-9]\d{9}$'
        if re.match(pattern, cleaned):
            # Format to standard: +91XXXXXXXXXX
            if cleaned.startswith('0'):
                cleaned = '+91' + cleaned[1:]
            elif not cleaned.startswith('+91'):
                cleaned = '+91' + cleaned
            return True, cleaned
    
    elif country_code == "US":  # United States
        # US numbers: +1 followed by 10 digits
        pattern = r'^(\+1)?[2-9]\d{2}[2-9]\d{6}$'
        if re.match(pattern, cleaned):
            if not cleaned.startswith('+1'):
                cleaned = '+1' + cleaned
            return True, cleaned
    
    # Generic validation (10-15 digits with optional +)
    pattern = r'^\+?[1-9]\d{9,14}$'
    if re.match(pattern, cleaned):
        if not cleaned.startswith('+'):
            cleaned = '+' + cleaned
        return True, cleaned
    
    return False, ""

def validate_url(url: str, require_https: bool = False) -> bool:
    """
    Validate URL format.
    
    Args:
        url: URL to validate
        require_https: If True, only HTTPS URLs are valid
        
    Returns:
        bool: True if URL is valid, False otherwise
    """
    if not url or not isinstance(url, str):
        return False
    
    # Add protocol if missing
    if not url.startswith(('http://', 'https://')):
        url = 'http://' + url
    
    try:
        result = urlparse(url)
        
        # Check scheme
        if require_https and result.scheme != 'https':
            return False
        
        # Check netloc (domain)
        if not result.netloc:
            return False
        
        # Check if domain has at least one dot
        if '.' not in result.netloc:
            return False
        
        # Check for common TLDs
        tld = result.netloc.split('.')[-1]
        if len(tld) < 2:
            return False
        
        return True
    except Exception:
        return False

def validate_domain(domain: str) -> bool:
    """
    Validate domain format (without protocol).
    
    Args:
        domain: Domain to validate (e.g., example.com)
        
    Returns:
        bool: True if domain is valid, False otherwise
    """
    if not domain or not isinstance(domain, str):
        return False
    
    domain = domain.strip().lower()
    
    # Domain pattern
    pattern = r'^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
    
    if not re.match(pattern, domain):
        return False
    
    # Check each part length
    parts = domain.split('.')
    for part in parts:
        if len(part) > 63:
            return False
    
    # Check total length
    if len(domain) > 253:
        return False
    
    # Check for consecutive dots or dashes
    if '..' in domain or '.-' in domain or '-.' in domain or '--' in domain:
        return False
    
    # Check TLD
    tld = parts[-1]
    if len(tld) < 2:
        return False
    
    return True

def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validate password strength.
    
    Args:
        password: Password to validate
        
    Returns:
        tuple: (is_valid: bool, message: str)
    """
    if not password:
        return False, "Password is required"
    
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if len(password) > 128:
        return False, "Password must be less than 128 characters"
    
    # Check for at least one digit
    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one digit"
    
    # Check for at least one letter
    if not any(char.isalpha() for char in password):
        return False, "Password must contain at least one letter"
    
    # Optional: Check for uppercase
    # if not any(char.isupper() for char in password):
    #     return False, "Password must contain at least one uppercase letter"
    
    # Optional: Check for lowercase
    # if not any(char.islower() for char in password):
    #     return False, "Password must contain at least one lowercase letter"
    
    # Optional: Check for special character
    # special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    # if not any(char in special_chars for char in password):
    #     return False, "Password must contain at least one special character"
    
    return True, "Password is valid"

def sanitize_input(text: str, max_length: Optional[int] = None, 
                   allow_html: bool = False) -> str:
    """
    Sanitize user input.
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
        allow_html: Whether to allow HTML tags
        
    Returns:
        str: Sanitized text
    """
    if not text:
        return ""
    
    # Convert to string
    text = str(text)
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    # Remove HTML tags if not allowed
    if not allow_html:
        text = re.sub(r'<[^>]*>', '', text)
    
    # Truncate if max_length specified
    if max_length and len(text) > max_length:
        text = text[:max_length]
    
    return text

def validate_numeric_range(value: float, min_val: float = 0, 
                          max_val: float = 1000000) -> bool:
    """
    Validate numeric value is within range.
    
    Args:
        value: Numeric value to validate
        min_val: Minimum allowed value
        max_val: Maximum allowed value
        
    Returns:
        bool: True if value is within range
    """
    try:
        num = float(value)
        return min_val <= num <= max_val
    except (ValueError, TypeError):
        return False

def validate_date_format(date_str: str, format: str = "%Y-%m-%d") -> bool:
    """
    Validate date string format.
    
    Args:
        date_str: Date string to validate
        format: Expected date format
        
    Returns:
        bool: True if date format is valid
    """
    try:
        from datetime import datetime
        datetime.strptime(date_str, format)
        return True
    except (ValueError, TypeError):
        return False

# Test function
def test_validators():
    """Test all validators."""
    tests = [
        ("Email", validate_email("test@example.com"), True),
        ("Email", validate_email("invalid-email"), False),
        ("URL", validate_url("https://example.com"), True),
        ("URL", validate_url("example.com"), True),
        ("URL", validate_url("invalid"), False),
        ("Domain", validate_domain("example.com"), True),
        ("Domain", validate_domain("-example.com"), False),
        ("Password", validate_password("Password123")[0], True),
        ("Password", validate_password("short")[0], False),
        ("Phone IN", validate_phone("9876543210", "IN")[0], True),
        ("Phone US", validate_phone("1234567890", "US")[0], False),
    ]
    
    for name, result, expected in tests:
        status = "✓" if result == expected else "✗"
        print(f"{status} {name}: {result} (expected: {expected})")

if __name__ == "__main__":
    test_validators()