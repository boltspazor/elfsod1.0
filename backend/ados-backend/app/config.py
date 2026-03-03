import os
from typing import List


class Settings:
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres.hkgcyrheviatmdflbxqu:c205abode123@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require",
    )

    # JWT
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "5e70f5d49c19a955b86951300631917ecfe40c4da7b02e9f1ad53287eb4fc7f7e20414562b37b862f24fe5244a75b3dc46b9ee70326ab8c703e54e2f8ec35b56",
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )

    # API Keys
    SCRAPECREATORS_API_KEY: str = os.getenv(
        "SCRAPECREATORS_API_KEY", "fmwCF2KKhHcgGyyKUJd9U6W1TTw2"
    )

    # Platform Limits
    MAX_ADS_PER_COMPETITOR: int = int(os.getenv("MAX_ADS_PER_COMPETITOR", "50"))
    GOOGLE_MAX_ENRICHMENT: int = int(os.getenv("GOOGLE_MAX_ENRICHMENT", "3"))
    FETCH_TIMEOUT: int = int(os.getenv("FETCH_TIMEOUT", "30"))

    # CORS - Parse comma-separated string
    ALLOWED_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5003"
        ).split(",")
    ]

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()
