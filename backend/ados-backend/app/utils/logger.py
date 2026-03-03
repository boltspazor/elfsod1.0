import logging
import logging.config
import sys
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
from app.config import settings

# Ensure log directory exists
LOG_DIR = "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "message": record.getMessage(),
        }
        
        # Add exception info if present
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields if present
        if hasattr(record, 'extra'):
            log_record.update(record.extra)
        
        return json.dumps(log_record, ensure_ascii=False)

class ColorFormatter(logging.Formatter):
    """Colored console formatter for development."""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[0;36m',  # Cyan
        'INFO': '\033[0;32m',   # Green
        'WARNING': '\033[0;33m', # Yellow
        'ERROR': '\033[0;31m',  # Red
        'CRITICAL': '\033[1;31m', # Bold Red
        'RESET': '\033[0m'      # Reset
    }
    
    def format(self, record):
        # Add color to level name
        levelname = record.levelname
        color = self.COLORS.get(levelname, self.COLORS['RESET'])
        record.levelname = f"{color}{levelname}{self.COLORS['RESET']}"
        
        # Color the message for ERROR and CRITICAL
        if levelname in ['ERROR', 'CRITICAL']:
            record.msg = f"{color}{record.msg}{self.COLORS['RESET']}"
        
        return super().format(record)

def setup_logging(
    log_level: Optional[str] = None,
    log_to_file: bool = True,
    log_to_console: bool = True,
    json_format: bool = False
) -> logging.Logger:
    """
    Setup logging configuration for the application.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_to_file: Whether to log to files
        log_to_console: Whether to log to console
        json_format: Whether to use JSON format (for production)
        
    Returns:
        logging.Logger: Root logger
    """
    # Determine log level
    if log_level is None:
        log_level = settings.LOG_LEVEL.upper()
    
    level = getattr(logging, log_level, logging.INFO)
    
    # Configure handlers
    handlers = {}
    
    if log_to_console:
        console_handler = {
            'class': 'logging.StreamHandler',
            'stream': sys.stdout,
            'formatter': 'json' if json_format else 'colored' if settings.ENVIRONMENT == 'development' else 'standard',
            'level': level
        }
        handlers['console'] = console_handler
    
    if log_to_file:
        # General application log
        file_handler = {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOG_DIR, 'app.log'),
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'json' if json_format else 'detailed',
            'encoding': 'utf-8',
            'level': level
        }
        handlers['file'] = file_handler
        
        # Error log (only errors)
        error_handler = {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOG_DIR, 'error.log'),
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'detailed',
            'encoding': 'utf-8',
            'level': logging.ERROR
        }
        handlers['error_file'] = error_handler
        
        # Audit log (for important events)
        audit_handler = {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOG_DIR, 'audit.log'),
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'json',
            'encoding': 'utf-8',
            'level': logging.INFO
        }
        handlers['audit_file'] = audit_handler
    
    # Formatters
    formatters = {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S'
        },
        'detailed': {
            'format': '%(asctime)s [%(levelname)s] %(name)s.%(module)s.%(funcName)s:%(lineno)d: %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S'
        },
        'colored': {
            '()': ColorFormatter,
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S'
        },
        'json': {
            '()': JSONFormatter
        }
    }
    
    # Configure loggers
    loggers = {
        '': {  # Root logger
            'handlers': list(handlers.keys()),
            'level': logging.WARNING,
            'propagate': True
        },
        'app': {
            'handlers': list(handlers.keys()),
            'level': level,
            'propagate': False
        },
        'app.api': {
            'handlers': list(handlers.keys()),
            'level': level,
            'propagate': False
        },
        'app.database': {
            'handlers': list(handlers.keys()),
            'level': level,
            'propagate': False
        },
        'app.services': {
            'handlers': list(handlers.keys()),
            'level': level,
            'propagate': False
        },
        'uvicorn': {
            'handlers': list(handlers.keys()),
            'level': logging.WARNING,
            'propagate': False
        },
        'sqlalchemy': {
            'handlers': list(handlers.keys()),
            'level': logging.WARNING,
            'propagate': False
        }
    }
    
    # Complete logging config
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': formatters,
        'handlers': handlers,
        'loggers': loggers
    }
    
    # Apply configuration
    logging.config.dictConfig(logging_config)
    
    # Get root logger
    logger = logging.getLogger('app')
    logger.info(f"Logging initialized. Level: {log_level}, Environment: {settings.ENVIRONMENT}")
    
    return logger

def get_logger(name: str = 'app') -> logging.Logger:
    """
    Get a logger instance.
    
    Args:
        name: Logger name (usually module name)
        
    Returns:
        logging.Logger: Logger instance
    """
    return logging.getLogger(name)

class AuditLogger:
    """Audit logging for security-relevant events."""
    
    def __init__(self):
        self.logger = logging.getLogger('audit')
        
    def log_login(self, user_id: str, email: str, ip_address: str, success: bool):
        """Log user login attempts."""
        extra = {
            'event': 'login',
            'user_id': user_id,
            'email': email,
            'ip_address': ip_address,
            'success': success,
            'timestamp': datetime.utcnow().isoformat() + "Z"
        }
        
        if success:
            self.logger.info(f"User login: {email}", extra=extra)
        else:
            self.logger.warning(f"Failed login attempt: {email}", extra=extra)
    
    def log_ad_fetch(self, user_id: str, competitor_id: str, platform: str, 
                     success: bool, ads_count: int = 0, error: Optional[str] = None):
        """Log ad fetch events."""
        extra = {
            'event': 'ad_fetch',
            'user_id': user_id,
            'competitor_id': competitor_id,
            'platform': platform,
            'success': success,
            'ads_count': ads_count,
            'error': error,
            'timestamp': datetime.utcnow().isoformat() + "Z"
        }
        
        if success:
            self.logger.info(f"Ad fetch completed: {platform} - {ads_count} ads", extra=extra)
        else:
            self.logger.error(f"Ad fetch failed: {platform} - {error}", extra=extra)
    
    def log_api_request(self, method: str, path: str, status_code: int, 
                        duration_ms: float, user_id: Optional[str] = None):
        """Log API requests for monitoring."""
        extra = {
            'event': 'api_request',
            'method': method,
            'path': path,
            'status_code': status_code,
            'duration_ms': duration_ms,
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat() + "Z"
        }
        
        level = logging.ERROR if status_code >= 500 else logging.WARNING if status_code >= 400 else logging.INFO
        self.logger.log(level, f"{method} {path} - {status_code} ({duration_ms:.2f}ms)", extra=extra)

# Global audit logger instance
audit_logger = AuditLogger()

# Context manager for timing code blocks
class Timer:
    """Context manager for timing code execution."""
    
    def __init__(self, name: str, logger: Optional[logging.Logger] = None):
        self.name = name
        self.logger = logger or get_logger()
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.utcnow()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        end_time = datetime.utcnow()
        duration = (end_time - self.start_time).total_seconds() * 1000  # Convert to ms
        
        if exc_type:
            self.logger.error(f"Timer '{self.name}' failed after {duration:.2f}ms", 
                            exc_info=(exc_type, exc_val, exc_tb))
        else:
            self.logger.debug(f"Timer '{self.name}' completed in {duration:.2f}ms")

# Function decorator for logging
def log_execution(logger_name: str = 'app', level: int = logging.DEBUG):
    """
    Decorator to log function execution.
    
    Args:
        logger_name: Name of the logger to use
        level: Logging level
        
    Returns:
        function: Decorated function
    """
    def decorator(func):
        logger = get_logger(logger_name)
        
        def wrapper(*args, **kwargs):
            logger.log(level, f"Executing {func.__name__}")
            start_time = datetime.utcnow()
            
            try:
                result = func(*args, **kwargs)
                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                logger.log(level, f"Completed {func.__name__} in {duration:.2f}ms")
                return result
            except Exception as e:
                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                logger.error(f"Failed {func.__name__} after {duration:.2f}ms: {e}", exc_info=True)
                raise
        
        return wrapper
    return decorator

# Test function
def test_logging():
    """Test logging configuration."""
    logger = setup_logging()
    
    logger.debug("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")
    logger.critical("This is a critical message")
    
    # Test with extra context
    logger.info("User action", extra={
        'user_id': '123',
        'action': 'login',
        'ip': '192.168.1.1'
    })
    
    # Test audit logging
    audit_logger.log_login(
        user_id="user_123",
        email="test@example.com",
        ip_address="192.168.1.1",
        success=True
    )
    
    # Test timer
    with Timer("test_operation"):
        import time
        time.sleep(0.1)
    
    print("✓ Logging test completed. Check logs/ directory for output.")

if __name__ == "__main__":
    test_logging()